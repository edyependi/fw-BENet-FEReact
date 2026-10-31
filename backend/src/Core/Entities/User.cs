namespace Core.Entities;

using Core.Entities.Enums;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Department { get; set; } = "General";

    // Plant Reference (FK)
    public string? PlantId { get; set; }
    public Plant? Plant { get; set; }

    // Primary/Legacy Role Reference (FK, nullable)
    public Guid? RoleId { get; set; }
    public Role? Role { get; set; }

    // Multi-Role Support (Identity & Access Governance)
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    // Multi-Document Support (Attribute-Based Access Control)
    public ICollection<UserDocument> UserDocuments { get; set; } = new List<UserDocument>();

    public ThemePreference Theme { get; set; } = ThemePreference.Corporate;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Document> Documents { get; set; } = new List<Document>();
}
