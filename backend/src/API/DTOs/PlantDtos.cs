namespace API.DTOs;

public record PlantDto(
    string PlantId,
    string PlantName,
    string PlantCode,
    string PlantType,
    string CompanyId,
    int UserCount
);

public record CreatePlantRequest(
    string PlantId,
    string PlantName,
    string PlantCode,
    string PlantType,
    string CompanyId
);

