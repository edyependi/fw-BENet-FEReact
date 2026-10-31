namespace Core.Entities;

public class Role
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? DepartmentScope { get; set; }
    public bool IsSystemRole { get; set; } = false;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

