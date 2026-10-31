namespace Infrastructure.Data;

using Core.Entities;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<DocumentPlant> DocumentPlants => Set<DocumentPlant>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<UserDocument> UserDocuments => Set<UserDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Plant Configuration (Reference Master)
        modelBuilder.Entity<Plant>(entity =>
        {
            entity.HasKey(p => p.PlantId);
            entity.Property(p => p.PlantId).HasMaxLength(4).IsRequired();
            entity.Property(p => p.PlantName).HasMaxLength(50).IsRequired();
            entity.Property(p => p.PlantCode).HasMaxLength(4).IsRequired();
            entity.Property(p => p.PlantType).HasMaxLength(8).IsRequired();
            entity.Property(p => p.CompanyId).HasMaxLength(4).IsRequired();
        });

        // 2. Role Configuration
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.Name).IsUnique();
            entity.Property(r => r.Name).HasMaxLength(50).IsRequired();
            entity.Property(r => r.Description).HasMaxLength(200);
        });

        // 3. Permission Configuration
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.Code).IsUnique();
            entity.Property(p => p.Code).HasMaxLength(100).IsRequired();
            entity.Property(p => p.Name).HasMaxLength(100).IsRequired();
            entity.Property(p => p.Category).HasMaxLength(50).IsRequired();
        });

        // 4. RolePermission (Many-to-Many Composite Key)
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(rp => new { rp.RoleId, rp.PermissionId });

            entity.HasOne(rp => rp.Role)
                  .WithMany(r => r.RolePermissions)
                  .HasForeignKey(rp => rp.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rp => rp.Permission)
                  .WithMany(p => p.RolePermissions)
                  .HasForeignKey(rp => rp.PermissionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // 5. User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();

            entity.Property(u => u.Theme)
                  .HasConversion<string>()
                  .HasMaxLength(20);

            entity.Property(u => u.Username).HasMaxLength(50).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(100).IsRequired();
            entity.Property(u => u.Department).HasMaxLength(50).IsRequired();

            entity.Property(u => u.PlantId).HasMaxLength(4);

            entity.HasOne(u => u.Plant)
                  .WithMany(p => p.Users)
                  .HasForeignKey(u => u.PlantId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(u => u.Role)
                  .WithMany(r => r.Users)
                  .HasForeignKey(u => u.RoleId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .IsRequired(false);
        });

        // 6. Document (ABAC Entity) Configuration
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Title).HasMaxLength(200).IsRequired();
            entity.Property(d => d.Department).HasMaxLength(50).IsRequired();
            entity.Property(d => d.Classification).HasMaxLength(30).IsRequired();

            entity.HasOne(d => d.Owner)
                  .WithMany(u => u.Documents)
                  .HasForeignKey(d => d.OwnerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // 7. DocumentPlant (Many-to-Many Composite Key for Multi-Plant Access)
        modelBuilder.Entity<DocumentPlant>(entity =>
        {
            entity.HasKey(dp => new { dp.DocumentId, dp.PlantId });

            entity.HasOne(dp => dp.Document)
                  .WithMany(d => d.DocumentPlants)
                  .HasForeignKey(dp => dp.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(dp => dp.Plant)
                  .WithMany(p => p.DocumentPlants)
                  .HasForeignKey(dp => dp.PlantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // 8. UserRole (Many-to-Many for Multi-Role / Identity & Access Governance)
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });

            entity.HasOne(ur => ur.User)
                  .WithMany(u => u.UserRoles)
                  .HasForeignKey(ur => ur.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ur => ur.Role)
                  .WithMany(r => r.UserRoles)
                  .HasForeignKey(ur => ur.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // 9. UserDocument (Many-to-Many for Multi-Document / Attribute-Based Access Control)
        modelBuilder.Entity<UserDocument>(entity =>
        {
            entity.HasKey(ud => new { ud.UserId, ud.DocumentId });

            entity.HasOne(ud => ud.User)
                  .WithMany(u => u.UserDocuments)
                  .HasForeignKey(ud => ud.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ud => ud.Document)
                  .WithMany(d => d.UserDocuments)
                  .HasForeignKey(ud => ud.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
