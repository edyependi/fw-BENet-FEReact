namespace API.Controllers;

using System.Security.Claims;
using API.DTOs;
using API.Security;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DocumentsController(AppDbContext context)
    {
        _context = context;
    }

    // 1. ABAC: List Documents based on Role, Department, Ownership & Multi-Plant Scoping
    [HttpGet]
    [HasPermission("documents.view")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetDocuments()
    {
        var currentUserId = GetCurrentUserId();
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == currentUserId);
        if (user == null) return Unauthorized();

        var isSuperAdmin = user.Role?.Name == "Super Admin" || User.IsInRole("Super Admin");
        var hasViewAll = User.HasClaim("permission", "documents.view_all");
        var userDepartment = user.Department;
        var userPlantId = user.PlantId;

        IQueryable<Document> query = _context.Documents
            .Include(d => d.Owner)
            .Include(d => d.DocumentPlants)
                .ThenInclude(dp => dp.Plant)
            .Include(d => d.UserDocuments);

        // ABAC Query Filtering with Multi-Plant & User-Document Scoping:
        if (isSuperAdmin)
        {
            // Super Admin can view all documents
        }
        else
        {
            query = query.Where(d => 
                d.OwnerId == currentUserId ||
                d.Classification == "Public" ||
                (userPlantId != null && d.DocumentPlants.Any(dp => dp.PlantId == userPlantId)) ||
                d.UserDocuments.Any(ud => ud.UserId == currentUserId) ||
                (hasViewAll && d.Department == userDepartment)
            );
        }

        var list = await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new DocumentDto(
                d.Id,
                d.Title,
                d.Content,
                d.Department,
                d.Classification,
                d.OwnerId,
                d.Owner.Username,
                d.DocumentPlants.Select(dp => dp.PlantId).ToList(),
                d.DocumentPlants.Select(dp => new DocumentPlantRefDto(dp.PlantId, dp.Plant.PlantCode, dp.Plant.PlantName)).ToList(),
                d.CreatedAt,
                isSuperAdmin || (d.OwnerId == currentUserId),
                isSuperAdmin || (d.OwnerId == currentUserId)
            ))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    [HasPermission("documents.view")]
    public async Task<ActionResult<DocumentDto>> GetDocumentById(Guid id)
    {
        var currentUserId = GetCurrentUserId();
        var doc = await _context.Documents
            .Include(d => d.Owner)
            .Include(d => d.DocumentPlants)
                .ThenInclude(dp => dp.Plant)
            .Include(d => d.UserDocuments)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null) return NotFound(new { message = "Dokumen tidak ditemukan." });

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == currentUserId);
        var isSuperAdmin = user?.Role?.Name == "Super Admin" || User.IsInRole("Super Admin");
        var hasViewAll = User.HasClaim("permission", "documents.view_all");
        var hasPlantAccess = user?.PlantId != null && doc.DocumentPlants.Any(dp => dp.PlantId == user.PlantId);
        var hasDirectUserAccess = doc.UserDocuments.Any(ud => ud.UserId == currentUserId);

        // ABAC Multi-level Guard:
        if (!isSuperAdmin && !hasViewAll && doc.OwnerId != currentUserId && doc.Classification != "Public" && !hasPlantAccess && !hasDirectUserAccess)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "ABAC Guard: Anda tidak memiliki akses ke dokumen ini (Departemen/Plant/Penugasan tidak sesuai)." });
        }

        return Ok(new DocumentDto(
            doc.Id,
            doc.Title,
            doc.Content,
            doc.Department,
            doc.Classification,
            doc.OwnerId,
            doc.Owner.Username,
            doc.DocumentPlants.Select(dp => dp.PlantId).ToList(),
            doc.DocumentPlants.Select(dp => new DocumentPlantRefDto(dp.PlantId, dp.Plant.PlantCode, dp.Plant.PlantName)).ToList(),
            doc.CreatedAt,
            isSuperAdmin || (doc.OwnerId == currentUserId),
            isSuperAdmin || (doc.OwnerId == currentUserId)
        ));
    }

    // 2. Create Document (Sets Ownership to Current User & Assigns Target Plants)
    [HttpPost]
    [HasPermission("documents.create")]
    public async Task<ActionResult<DocumentDto>> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(currentUserId);
        if (user == null) return Unauthorized();

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Content = request.Content,
            Department = string.IsNullOrWhiteSpace(request.Department) ? user.Department : request.Department,
            Classification = string.IsNullOrWhiteSpace(request.Classification) ? "Internal" : request.Classification,
            OwnerId = currentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.PlantIds != null && request.PlantIds.Count > 0)
        {
            foreach (var plantId in request.PlantIds.Distinct())
            {
                doc.DocumentPlants.Add(new DocumentPlant { DocumentId = doc.Id, PlantId = plantId });
            }
        }

        _context.Documents.Add(doc);
        await _context.SaveChangesAsync();

        var plants = await _context.DocumentPlants
            .Where(dp => dp.DocumentId == doc.Id)
            .Include(dp => dp.Plant)
            .Select(dp => new DocumentPlantRefDto(dp.PlantId, dp.Plant.PlantCode, dp.Plant.PlantName))
            .ToListAsync();

        return CreatedAtAction(nameof(GetDocumentById), new { id = doc.Id },
            new DocumentDto(
                doc.Id, 
                doc.Title, 
                doc.Content, 
                doc.Department, 
                doc.Classification, 
                doc.OwnerId, 
                user.Username, 
                plants.Select(p => p.PlantId).ToList(),
                plants, 
                doc.CreatedAt, 
                true, 
                true
            ));
    }

    // 3. ABAC Data Ownership: Update Document (Only Owner or Super Admin)
    [HttpPut("{id}")]
    [HasPermission("documents.edit")]
    public async Task<IActionResult> UpdateDocument(Guid id, [FromBody] UpdateDocumentRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var doc = await _context.Documents
            .Include(d => d.DocumentPlants)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null) return NotFound(new { message = "Dokumen tidak ditemukan." });

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == currentUserId);
        var isSuperAdmin = user?.Role.Name == "Super Admin";

        // ABAC Enforcement: Data Ownership
        if (!isSuperAdmin && doc.OwnerId != currentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "ABAC Violation: Anda hanya dapat mengubah dokumen milik Anda sendiri." });
        }

        doc.Title = request.Title;
        doc.Content = request.Content;
        if (!string.IsNullOrWhiteSpace(request.Department))
        {
            doc.Department = request.Department;
        }
        doc.Classification = request.Classification;
        doc.UpdatedAt = DateTime.UtcNow;

        if (request.PlantIds != null)
        {
            _context.DocumentPlants.RemoveRange(doc.DocumentPlants);
            foreach (var plantId in request.PlantIds.Distinct())
            {
                doc.DocumentPlants.Add(new DocumentPlant { DocumentId = id, PlantId = plantId });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Dokumen berhasil diperbarui." });
    }

    // 4. ABAC Data Ownership: Delete Document (Only Owner or Super Admin)
    [HttpDelete("{id}")]
    [HasPermission("documents.delete")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var currentUserId = GetCurrentUserId();
        var doc = await _context.Documents.FindAsync(id);
        if (doc == null) return NotFound(new { message = "Dokumen tidak ditemukan." });

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == currentUserId);
        var isSuperAdmin = user?.Role.Name == "Super Admin";

        // ABAC Enforcement: Data Ownership
        if (!isSuperAdmin && doc.OwnerId != currentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "ABAC Violation: Anda hanya dapat menghapus dokumen yang Anda buat sendiri." });
        }

        _context.Documents.Remove(doc);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Dokumen berhasil dihapus." });
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out var guid))
        {
            throw new UnauthorizedAccessException("Claim user identifier tidak valid.");
        }
        return guid;
    }
}
