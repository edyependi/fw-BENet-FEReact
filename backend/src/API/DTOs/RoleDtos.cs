namespace API.DTOs;

public record PermissionDto(
    Guid Id, 
    string Code, 
    string Name, 
    string Category, 
    string Description, 
    bool IsSystemPermission
);

public record CreatePermissionRequest(
    string Code, 
    string Name, 
    string Category, 
    string Description
);

public record UpdatePermissionRequest(
    string Name, 
    string Category, 
    string Description
);

public record RoleDto(
    Guid Id, 
    string Name, 
    string Description, 
    string? DepartmentScope, 
    bool IsSystemRole, 
    List<string> Permissions, 
    int UserCount
);

public record CreateRoleRequest(
    string Name, 
    string Description, 
    string? DepartmentScope, 
    List<string>? Permissions,
    List<Guid>? PermissionIds
);

public record UpdateRoleRequest(
    string Name, 
    string Description, 
    string? DepartmentScope, 
    List<string>? Permissions,
    List<Guid>? PermissionIds
);
