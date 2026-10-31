namespace Core.Entities;

public class DocumentPlant
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public string PlantId { get; set; } = string.Empty;
    public Plant Plant { get; set; } = null!;
}

