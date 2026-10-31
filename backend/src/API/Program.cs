using System.Text;
using API.Security;
using Core.Entities;
using Core.Entities.Enums;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Decoupled Database Setup
builder.Services.AddAppDatabase(builder.Configuration);

// 2. JWT Setup
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SUPER_SECRET_KEY_MIN_32_CHARACTERS_LONG_FOR_SECURITY!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "EnterpriseApi",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "EnterpriseUsers",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// 3. Permission-Based Dynamic Authorization
builder.Services.AddSingleton<IAuthorizationPolicyProvider, DynamicPermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger dengan dukungan Authorization Bearer Header
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Enterprise Refine & .NET API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Masukkan token JWT dengan format: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 4. CORS untuk React Refine
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClient", p =>
        p.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000")
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowClient");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// 5. Database Auto-Migration & Comprehensive RBAC Initial Seeding
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Auto-migrate column IsSystemPermission if missing in existing SQLite database
    try
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE \"Permissions\" ADD COLUMN \"IsSystemPermission\" INTEGER NOT NULL DEFAULT 0;");
    }
    catch
    {
        // Column already exists
    }

    // Auto-create Plants table if missing
    try
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""Plants"" (
                ""PlantId"" TEXT NOT NULL PRIMARY KEY,
                ""PlantName"" TEXT NOT NULL,
                ""PlantCode"" TEXT NOT NULL,
                ""PlantType"" TEXT NOT NULL,
                ""CompanyId"" TEXT NOT NULL
            );
        ");
    }
    catch
    {
    }

    // Auto-migrate column PlantId in Users if missing
    try
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN \"PlantId\" TEXT NULL REFERENCES \"Plants\" (\"PlantId\") ON DELETE SET NULL;");
    }
    catch
    {
    }

    // Auto-create DocumentPlants table if missing
    try
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""DocumentPlants"" (
                ""DocumentId"" TEXT NOT NULL,
                ""PlantId"" TEXT NOT NULL,
                PRIMARY KEY (""DocumentId"", ""PlantId""),
                FOREIGN KEY (""DocumentId"") REFERENCES ""Documents"" (""Id"") ON DELETE CASCADE,
                FOREIGN KEY (""PlantId"") REFERENCES ""Plants"" (""PlantId"") ON DELETE CASCADE
            );
        ");
    }
    catch
    {
    }

    // Auto-create UserRoles table if missing (Multi-Role Identity & Access Governance)
    try
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""UserRoles"" (
                ""UserId"" TEXT NOT NULL,
                ""RoleId"" TEXT NOT NULL,
                PRIMARY KEY (""UserId"", ""RoleId""),
                FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
                FOREIGN KEY (""RoleId"") REFERENCES ""Roles"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Sync existing Users.RoleId to UserRoles if empty
        db.Database.ExecuteSqlRaw(@"
            INSERT OR IGNORE INTO ""UserRoles"" (""UserId"", ""RoleId"")
            SELECT ""Id"", ""RoleId"" FROM ""Users"" WHERE ""RoleId"" IS NOT NULL;
        ");
    }
    catch
    {
    }

    // Auto-create UserDocuments table if missing (Multi-Document Attribute-Based Access Control)
    try
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""UserDocuments"" (
                ""UserId"" TEXT NOT NULL,
                ""DocumentId"" TEXT NOT NULL,
                PRIMARY KEY (""UserId"", ""DocumentId""),
                FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
                FOREIGN KEY (""DocumentId"") REFERENCES ""Documents"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Sync existing Documents.OwnerId to UserDocuments if empty
        db.Database.ExecuteSqlRaw(@"
            INSERT OR IGNORE INTO ""UserDocuments"" (""UserId"", ""DocumentId"")
            SELECT ""OwnerId"", ""Id"" FROM ""Documents"" WHERE ""OwnerId"" IS NOT NULL;
        ");
    }
    catch
    {
    }

    // Seed sample Plants if empty
    if (!db.Plants.Any())
    {
        db.Plants.AddRange(
            new Plant { PlantId = "P001", PlantName = "Jakarta Main Plant", PlantCode = "JKT1", PlantType = "Factory", CompanyId = "C001" },
            new Plant { PlantId = "P002", PlantName = "Surabaya Distribution Center", PlantCode = "SBY1", PlantType = "Warehouse", CompanyId = "C001" },
            new Plant { PlantId = "P003", PlantName = "Bandung Assembly Plant", PlantCode = "BDO1", PlantType = "Factory", CompanyId = "C001" },
            new Plant { PlantId = "P004", PlantName = "Headquarter Central Office", PlantCode = "HQ01", PlantType = "HQ", CompanyId = "C001" }
        );
        db.SaveChanges();
    }

    // Set default Plant for initial users if not assigned
    try
    {
        db.Database.ExecuteSqlRaw(@"
            UPDATE ""Users"" SET ""PlantId"" = 'P004' WHERE ""Username"" = 'superadmin' AND ""PlantId"" IS NULL;
            UPDATE ""Users"" SET ""PlantId"" = 'P004' WHERE ""Username"" = 'financemanager' AND ""PlantId"" IS NULL;
            UPDATE ""Users"" SET ""PlantId"" = 'P001' WHERE ""Username"" = 'engstaff' AND ""PlantId"" IS NULL;
            UPDATE ""Users"" SET ""PlantId"" = 'P002' WHERE ""Username"" = 'financestaff' AND ""PlantId"" IS NULL;
        ");
    }
    catch
    {
    }

    // Seed sample DocumentPlants relations if empty
    try
    {
        if (!db.DocumentPlants.Any())
        {
            var allDocs = db.Documents.ToList();
            foreach (var doc in allDocs)
            {
                if (doc.Title.Contains("Microservices"))
                {
                    db.DocumentPlants.Add(new DocumentPlant { DocumentId = doc.Id, PlantId = "P001" });
                    db.DocumentPlants.Add(new DocumentPlant { DocumentId = doc.Id, PlantId = "P003" });
                }
                else if (doc.Title.Contains("Audit Finansial"))
                {
                    db.DocumentPlants.Add(new DocumentPlant { DocumentId = doc.Id, PlantId = "P004" });
                }
                else if (doc.Title.Contains("Reimbursement"))
                {
                    db.DocumentPlants.Add(new DocumentPlant { DocumentId = doc.Id, PlantId = "P002" });
                }
            }
            db.SaveChanges();
        }
    }
    catch
    {
    }

    // Pastikan 11 permission sistem bawaan memiliki IsSystemPermission = true (1)
    db.Database.ExecuteSqlRaw(@"
        UPDATE ""Permissions"" 
        SET ""IsSystemPermission"" = 1 
        WHERE ""Code"" IN (
            'users.view', 'users.create', 'users.edit', 'users.delete', 
            'roles.view', 'roles.manage', 
            'documents.view', 'documents.view_all', 'documents.create', 'documents.edit', 'documents.delete'
        );
    ");

    if (!db.Permissions.Any())
    {
        // A. Seed Granular Permissions (Marked as System Core Permissions)
        var permissions = new List<Permission>
        {
            new() { Id = Guid.NewGuid(), Code = "users.view", Name = "View Users", Category = "User Management", Description = "Melihat daftar dan detail user", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "users.create", Name = "Create User", Category = "User Management", Description = "Menambahkan user baru", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "users.edit", Name = "Edit User", Category = "User Management", Description = "Mengubah data dan role user", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "users.delete", Name = "Delete User", Category = "User Management", Description = "Menghapus akun user", IsSystemPermission = true },

            new() { Id = Guid.NewGuid(), Code = "roles.view", Name = "View Roles", Category = "Role Management", Description = "Melihat matriks role dan permissions", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "roles.manage", Name = "Manage Roles", Category = "Role Management", Description = "Menambah/mengubah role kustom dan permissions", IsSystemPermission = true },

            new() { Id = Guid.NewGuid(), Code = "documents.view", Name = "View Documents", Category = "Documents", Description = "Melihat dokumen milik sendiri atau publik", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "documents.view_all", Name = "View Department Documents", Category = "Documents", Description = "ABAC: Melihat seluruh dokumen di departemen", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "documents.create", Name = "Create Document", Category = "Documents", Description = "Membuat dokumen baru", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "documents.edit", Name = "Edit Document", Category = "Documents", Description = "ABAC: Mengedit dokumen milik sendiri", IsSystemPermission = true },
            new() { Id = Guid.NewGuid(), Code = "documents.delete", Name = "Delete Document", Category = "Documents", Description = "ABAC: Menghapus dokumen milik sendiri", IsSystemPermission = true }
        };
        db.Permissions.AddRange(permissions);
        db.SaveChanges();

        // B. Seed Dynamic Roles
        var superAdminRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Super Admin",
            Description = "Akses tertinggi sistem ke seluruh modul dan data tanpa batas",
            IsSystemRole = true,
            DepartmentScope = null
        };
        foreach (var p in permissions)
        {
            superAdminRole.RolePermissions.Add(new RolePermission { RoleId = superAdminRole.Id, PermissionId = p.Id });
        }

        var financeManagerRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Finance Manager",
            Description = "Manajer Keuangan: dapat memonitor seluruh dokumen departemen Finance",
            IsSystemRole = false,
            DepartmentScope = "Finance"
        };
        var finMgrPerms = permissions.Where(p => 
            p.Code is "users.view" or "documents.view" or "documents.view_all" or "documents.create" or "documents.edit"
        ).ToList();
        foreach (var p in finMgrPerms)
        {
            financeManagerRole.RolePermissions.Add(new RolePermission { RoleId = financeManagerRole.Id, PermissionId = p.Id });
        }

        var engStaffRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Engineering Staff",
            Description = "Staff IT: hanya dapat membuat dan mengelola dokumen teknis miliknya sendiri",
            IsSystemRole = false,
            DepartmentScope = "IT & Engineering"
        };
        var engStaffPerms = permissions.Where(p => 
            p.Code is "documents.view" or "documents.create" or "documents.edit" or "documents.delete"
        ).ToList();
        foreach (var p in engStaffRolePerms(permissions))
        {
            engStaffRole.RolePermissions.Add(new RolePermission { RoleId = engStaffRole.Id, PermissionId = p.Id });
        }

        var finStaffRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Finance Staff",
            Description = "Staff Keuangan: membuat dan memanipulasi dokumen keuangan miliknya sendiri",
            IsSystemRole = false,
            DepartmentScope = "Finance"
        };
        foreach (var p in engStaffRolePerms(permissions))
        {
            finStaffRole.RolePermissions.Add(new RolePermission { RoleId = finStaffRole.Id, PermissionId = p.Id });
        }

        db.Roles.AddRange(superAdminRole, financeManagerRole, engStaffRole, finStaffRole);
        db.SaveChanges();

        // C. Seed Initial Users
        var superAdmin = new User
        {
            Id = Guid.NewGuid(),
            Username = "superadmin",
            Email = "superadmin@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Department = "Executive",
            PlantId = "P004",
            RoleId = superAdminRole.Id,
            Theme = ThemePreference.Corporate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            Email = "admin@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Department = "Executive",
            PlantId = "P004",
            RoleId = superAdminRole.Id,
            Theme = ThemePreference.Corporate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var finManager = new User
        {
            Id = Guid.NewGuid(),
            Username = "financemanager",
            Email = "finance.mgr@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("manager123"),
            Department = "Finance",
            PlantId = "P004",
            RoleId = financeManagerRole.Id,
            Theme = ThemePreference.Dark,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var engStaff = new User
        {
            Id = Guid.NewGuid(),
            Username = "engstaff",
            Email = "eng.staff@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
            Department = "IT & Engineering",
            PlantId = "P001",
            RoleId = engStaffRole.Id,
            Theme = ThemePreference.Light,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var finStaff = new User
        {
            Id = Guid.NewGuid(),
            Username = "financestaff",
            Email = "fin.staff@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
            Department = "Finance",
            PlantId = "P002",
            RoleId = finStaffRole.Id,
            Theme = ThemePreference.Corporate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.AddRange(superAdmin, adminUser, finManager, engStaff, finStaff);
        db.SaveChanges();

        // D. Seed Sample Documents for ABAC & Data Ownership testing
        db.Documents.AddRange(
            new Document
            {
                Id = Guid.NewGuid(),
                Title = "Laporan Audit Finansial Q4 (Confidential)",
                Content = "Rangkuman audit keuangan akhir tahun departemen Finance untuk direksi.",
                Department = "Finance",
                Classification = "Confidential",
                OwnerId = finManager.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new Document
            {
                Id = Guid.NewGuid(),
                Title = "Pengajuan Klaim Reimbursement Tim Finance",
                Content = "Daftar klaim operasional harian tim finance bulan berjalan.",
                Department = "Finance",
                Classification = "Internal",
                OwnerId = finStaff.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Document
            {
                Id = Guid.NewGuid(),
                Title = "Dokumen Arsitektur Microservices & Kubernetes",
                Content = "Spesifikasi teknis deployment infrastruktur .NET 10 dan React Refine.",
                Department = "IT & Engineering",
                Classification = "Internal",
                OwnerId = engStaff.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Document
            {
                Id = Guid.NewGuid(),
                Title = "Kebijakan Keamanan Siber Perusahaan",
                Content = "Pedoman standar keamanan informasi dan kepatuhan data ISO 27001.",
                Department = "Executive",
                Classification = "Public",
                OwnerId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-10)
            }
        );
        db.SaveChanges();
    }
}

static IEnumerable<Permission> engStaffRolePerms(List<Permission> all) =>
    all.Where(p => p.Code is "documents.view" or "documents.create" or "documents.edit" or "documents.delete");

app.Run();
