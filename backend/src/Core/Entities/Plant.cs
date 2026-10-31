namespace Core.Entities;

public class Plant
{
    public string PlantId { get; set; } = string.Empty;
    public string PlantName { get; set; } = string.Empty;
    public string PlantCode { get; set; } = string.Empty;
    public string PlantType { get; set; } = string.Empty;
    public string CompanyId { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<DocumentPlant> DocumentPlants { get; set; } = new List<DocumentPlant>();
}

