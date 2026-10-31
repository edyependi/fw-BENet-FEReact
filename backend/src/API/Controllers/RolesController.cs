namespace API.Controllers;

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
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RolesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HasPermission("roles.view")]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetRoles()
    {
        var roles = await _context.Roles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.Users)
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto(
                r.Id,
                r.Name,
                r.Description,
                r.DepartmentScope,
                r.IsSystemRole,
                r.RolePermissions.Select(rp => rp.Permission.Code).ToList(),
                r.Users.Count
            ))
            .ToListAsync();

        return Ok(roles);
    }

    [HttpGet("permissions")]
    [HasPermission("roles.view")]
    public async Task<ActionResult<IEnumerable<PermissionDto>>> GetAllPermissions()
    {
        var permissions = await _context.Permissions
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Name)
            .Select(p => new PermissionDto(p.Id, p.Code, p.Name, p.Category, p.Description, p.IsSystemPermission))
            .ToListAsync();

        return Ok(permissions);
    }

    [HttpPost("permissions")]
    [HasPermission("roles.manage")]
    public async Task<ActionResult<PermissionDto>> CreatePermission([FromBody] CreatePermissionRequest request)
    {
        var code = request.Code.Trim().ToLowerInvariant();
        var exists = await _context.Permissions.AnyAsync(p => p.Code.ToLower() == code);
        if (exists)
        {
            return BadRequest(new { message = $"Kode permission '{request.Code}' sudah ada di katalog." });
        }

        var perm = new Permission
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = request.Name,
            Category = request.Category,
            Description = request.Description,
            IsSystemPermission = false // Custom created permission
        };

        _context.Permissions.Add(perm);
        await _context.SaveChangesAsync();

        return Ok(new PermissionDto(perm.Id, perm.Code, perm.Name, perm.Category, perm.Description, false));
    }

    [HttpPut("permissions/{id}")]
    [HasPermission("roles.manage")]
    public async Task<IActionResult> UpdatePermission(Guid id, [FromBody] UpdatePermissionRequest request)
    {
        var perm = await _context.Permissions.FindAsync(id);
        if (perm == null) return NotFound(new { message = "Permission tidak ditemukan." });

        perm.Name = request.Name;
        perm.Category = request.Category;
        perm.Description = request.Description;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Permission berhasil diperbarui." });
    }

    [HttpDelete("permissions/{id}")]
    [HasPermission("roles.manage")]
    public async Task<IActionResult> DeletePermission(Guid id)
    {
        var perm = await _context.Permissions.FindAsync(id);
        if (perm == null) return NotFound(new { message = "Permission tidak ditemukan." });

        // Proteksi: System Core Permission ditandai khusus dan DILARANG dihapus
        if (perm.IsSystemPermission)
        {
            return BadRequest(new { message = "System Core Permission bertanda khusus dilarang dihapus untuk menjaga stabilitas sistem." });
        }

        _context.Permissions.Remove(perm);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Permission berhasil dihapus dari katalog." });
    }

    [HttpGet("{id}")]
    [HasPermission("roles.view")]
    public async Task<ActionResult<RoleDto>> GetRoleById(Guid id)
    {
        var r = await _context.Roles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.Users)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r == null) return NotFound(new { message = "Role tidak ditemukan." });

        return Ok(new RoleDto(
            r.Id,
            r.Name,
            r.Description,
            r.DepartmentScope,
            r.IsSystemRole,
            r.RolePermissions.Select(rp => rp.Permission.Code).ToList(),
            r.Users.Count
        ));
    }

    [HttpPost]
    [HasPermission("roles.manage")]
    public async Task<ActionResult<RoleDto>> CreateRole([FromBody] CreateRoleRequest request)
    {
        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == request.Name.ToLower());
        if (exists) return BadRequest(new { message = "Nama role sudah ada di sistem." });

        var role = new Role
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            DepartmentScope = request.DepartmentScope,
            IsSystemRole = false
        };

        var validPermissions = await _context.Permissions
            .Where(p => 
                (request.Permissions != null && request.Permissions.Contains(p.Code)) ||
                (request.PermissionIds != null && request.PermissionIds.Contains(p.Id))
            )
            .ToListAsync();

        foreach (var perm in validPermissions)
        {
            role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
        }

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRoleById), new { id = role.Id }, 
            new RoleDto(role.Id, role.Name, role.Description, role.DepartmentScope, false, 
                role.RolePermissions.Select(rp => rp.Permission?.Code ?? "").Where(c => !string.IsNullOrEmpty(c)).ToList(), 0));
    }

    [HttpPut("{id}")]
    [HasPermission("roles.manage")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null) return NotFound(new { message = "Role tidak ditemukan." });

        if (role.IsSystemRole && role.Name != request.Name)
        {
            return BadRequest(new { message = "Nama System Role bawaan tidak boleh diubah." });
        }

        role.Name = request.Name;
        role.Description = request.Description;
        role.DepartmentScope = request.DepartmentScope;

        // Update Matrix Permission
        role.RolePermissions.Clear();
        var permissions = await _context.Permissions
            .Where(p => 
                (request.Permissions != null && request.Permissions.Contains(p.Code)) ||
                (request.PermissionIds != null && request.PermissionIds.Contains(p.Id))
            )
            .ToListAsync();

        foreach (var p in permissions)
        {
            role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = p.Id });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Role dan permission matrix berhasil diperbarui." });
    }

    [HttpDelete("{id}")]
    [HasPermission("roles.manage")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        var role = await _context.Roles.Include(r => r.Users).FirstOrDefaultAsync(r => r.Id == id);
        if (role == null) return NotFound(new { message = "Role tidak ditemukan." });

        if (role.IsSystemRole)
        {
            return BadRequest(new { message = "System Role bawaan tidak boleh dihapus." });
        }

        if (role.Users.Any())
        {
            return BadRequest(new { message = $"Tidak dapat menghapus role karena masih digunakan oleh {role.Users.Count} user." });
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Role berhasil dihapus." });
    }
}
