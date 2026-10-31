namespace API.DTOs;

public record LoginRequest(string Username, string Password);
public record AuthResponse(string Token, UserProfileDto User);

public record UserProfileDto(
    Guid Id, 
    string Username, 
    string Email, 
    string Department, 
    string? PlantId,
    string? PlantName,
    string? PlantCode,
    string Role, 
    List<string> Roles,
    List<string> Permissions, 
    string ThemePreference
);

public record UpdateThemeRequest(string ThemePreference);

public record CreateUserRequest(
    string Username, 
    string Email, 
    string Password, 
    string Department, 
    string? PlantId,
    Guid? RoleId, 
    List<Guid>? RoleIds,
    List<Guid>? DocumentIds,
    string ThemePreference
);

public record UpdateUserRequest(
    string Email, 
    string? Password, 
    string Department, 
    string? PlantId,
    Guid? RoleId, 
    List<Guid>? RoleIds,
    List<Guid>? DocumentIds,
    string ThemePreference
);

public record UserListItemDto(
    Guid Id, 
    string Username, 
    string Email, 
    string Department, 
    string? PlantId,
    string? PlantName,
    string? PlantCode,
    Guid? RoleId, 
    string RoleName, 
    List<Guid> RoleIds,
    List<string> RoleNames,
    List<Guid> DocumentIds,
    List<string> DocumentTitles,
    string ThemePreference, 
    DateTime CreatedAt
);
