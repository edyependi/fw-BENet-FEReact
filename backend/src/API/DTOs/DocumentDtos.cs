namespace API.DTOs;

public record DocumentPlantRefDto(string PlantId, string PlantCode, string PlantName);

public record DocumentDto(
    Guid Id, 
    string Title, 
    string Content, 
    string Department, 
    string Classification, 
    Guid OwnerId, 
    string OwnerUsername, 
    List<string> PlantIds,
    List<DocumentPlantRefDto> Plants,
    DateTime CreatedAt, 
    bool CanEdit, 
    bool CanDelete
);

public record CreateDocumentRequest(
    string Title, 
    string Content, 
    string Department, 
    string Classification,
    List<string>? PlantIds
);

public record UpdateDocumentRequest(
    string Title, 
    string Content, 
    string Department, 
    string Classification,
    List<string>? PlantIds
);
