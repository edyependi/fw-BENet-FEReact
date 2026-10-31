namespace Core.Entities;

public class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Classification { get; set; } = "Internal"; // Public, Internal, Confidential

    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public ICollection<DocumentPlant> DocumentPlants { get; set; } = new List<DocumentPlant>();
    public ICollection<UserDocument> UserDocuments { get; set; } = new List<UserDocument>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

