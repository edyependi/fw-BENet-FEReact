namespace Core.Entities;

public class UserDocument
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;
}

