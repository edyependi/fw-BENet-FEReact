namespace API.Controllers;

using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PlantsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PlantsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PlantDto>>> GetPlants()
    {
        var plants = await _context.Plants
            .Include(p => p.Users)
            .OrderBy(p => p.PlantId)
            .Select(p => new PlantDto(
                p.PlantId,
                p.PlantName,
                p.PlantCode,
                p.PlantType,
                p.CompanyId,
                p.Users.Count
            ))
            .ToListAsync();

        return Ok(plants);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PlantDto>> GetPlantById(string id)
    {
        var p = await _context.Plants
            .Include(p => p.Users)
            .FirstOrDefaultAsync(p => p.PlantId == id);

        if (p == null) return NotFound(new { message = "Plant tidak ditemukan." });

        return Ok(new PlantDto(
            p.PlantId,
            p.PlantName,
            p.PlantCode,
            p.PlantType,
            p.CompanyId,
            p.Users.Count
        ));
    }

    [HttpPost]
    [Authorize(Roles = "Super Admin")]
    public async Task<ActionResult<PlantDto>> CreatePlant([FromBody] CreatePlantRequest request)
    {
        var id = request.PlantId.Trim().ToUpperInvariant();
        if (id.Length > 4) return BadRequest(new { message = "PlantId maksimal 4 karakter (char4)." });

        var exists = await _context.Plants.AnyAsync(p => p.PlantId == id);
        if (exists) return BadRequest(new { message = $"Plant dengan ID '{id}' sudah ada." });

        var plant = new Plant
        {
            PlantId = id,
            PlantName = request.PlantName,
            PlantCode = request.PlantCode.Trim().ToUpperInvariant(),
            PlantType = request.PlantType.Trim(),
            CompanyId = request.CompanyId.Trim().ToUpperInvariant()
        };

        _context.Plants.Add(plant);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPlantById), new { id = plant.PlantId },
            new PlantDto(plant.PlantId, plant.PlantName, plant.PlantCode, plant.PlantType, plant.CompanyId, 0));
    }
}

