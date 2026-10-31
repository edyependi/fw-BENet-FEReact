namespace API.Controllers;

using System.Security.Claims;
using API.DTOs;
using API.Security;
using ClosedXML.Excel;
using Core.Entities;
using Core.Entities.Enums;
using UserRole = Core.Entities.UserRole;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    // 1. Current User Profile
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .Include(u => u.Plant)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound("User tidak ditemukan.");

        var roleNames = user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToList();
        if (!roleNames.Any() && user.Role != null)
        {
            roleNames.Add(user.Role.Name);
        }

        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
            .Distinct()
            .ToList();

        if (user.Role != null)
        {
            permissions = permissions.Union(user.Role.RolePermissions.Select(rp => rp.Permission.Code)).Distinct().ToList();
        }

        return Ok(new UserProfileDto(
            user.Id, 
            user.Username, 
            user.Email, 
            user.Department, 
            user.PlantId, 
            user.Plant?.PlantName, 
            user.Plant?.PlantCode, 
            roleNames.FirstOrDefault() ?? user.Role?.Name ?? "User", 
            roleNames,
            permissions, 
            user.Theme.ToString()
        ));
    }

    // 2. Update Current User Theme
    [HttpPatch("me/theme")]
    public async Task<IActionResult> UpdateThemePreference([FromBody] UpdateThemeRequest request)
    {
        if (!Enum.TryParse<ThemePreference>(request.ThemePreference, true, out var parsedTheme))
        {
            return BadRequest(new { message = "Nilai tema tidak valid. Pilihan: Light, Dark, Corporate" });
        }

        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound("User tidak ditemukan.");

        user.Theme = parsedTheme;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new 
        { 
            message = "Preferensi tema berhasil diperbarui", 
            currentTheme = user.Theme.ToString() 
        });
    }

    // 3. Granular RBAC: List All Users (with Multi-Role & Multi-Document ABAC & Filters)
    [HttpGet]
    [HasPermission("users.view")]
    public async Task<ActionResult<IEnumerable<UserListItemDto>>> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? department = null,
        [FromQuery] string? plantId = null,
        [FromQuery] Guid? roleId = null)
    {
        var query = _context.Users
            .Include(u => u.Role)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserDocuments)
                .ThenInclude(ud => ud.Document)
            .Include(u => u.Plant)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.Username.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(department))
        {
            var dept = department.Trim().ToLower();
            query = query.Where(u => u.Department.ToLower() == dept);
        }

        if (!string.IsNullOrWhiteSpace(plantId))
        {
            query = query.Where(u => u.PlantId == plantId);
        }

        if (roleId.HasValue)
        {
            query = query.Where(u => u.RoleId == roleId || u.UserRoles.Any(ur => ur.RoleId == roleId.Value));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var dtos = users.Select(u =>
        {
            var roleIds = u.UserRoles.Select(ur => ur.RoleId).ToList();
            var roleNames = u.UserRoles.Select(ur => ur.Role.Name).ToList();
            if (!roleIds.Any() && u.RoleId.HasValue)
            {
                roleIds.Add(u.RoleId.Value);
                if (u.Role != null) roleNames.Add(u.Role.Name);
            }

            var docIds = u.UserDocuments.Select(ud => ud.DocumentId).ToList();
            var docTitles = u.UserDocuments.Select(ud => ud.Document.Title).ToList();

            var primaryRoleId = roleIds.FirstOrDefault();
            var primaryRoleName = roleNames.FirstOrDefault() ?? u.Role?.Name ?? "User";

            return new UserListItemDto(
                u.Id,
                u.Username,
                u.Email,
                u.Department,
                u.PlantId,
                u.Plant?.PlantName,
                u.Plant?.PlantCode,
                primaryRoleId,
                primaryRoleName,
                roleIds,
                roleNames,
                docIds,
                docTitles,
                u.Theme.ToString(),
                u.CreatedAt
            );
        }).ToList();

        return Ok(dtos);
    }

    // 4. Granular RBAC: Get User by ID
    [HttpGet("{id}")]
    [HasPermission("users.view")]
    public async Task<ActionResult<UserListItemDto>> GetUserById(Guid id)
    {
        var u = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserDocuments)
                .ThenInclude(ud => ud.Document)
            .Include(u => u.Plant)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (u == null) return NotFound(new { message = "User tidak ditemukan." });

        var roleIds = u.UserRoles.Select(ur => ur.RoleId).ToList();
        var roleNames = u.UserRoles.Select(ur => ur.Role.Name).ToList();
        if (!roleIds.Any() && u.RoleId.HasValue)
        {
            roleIds.Add(u.RoleId.Value);
            if (u.Role != null) roleNames.Add(u.Role.Name);
        }

        var docIds = u.UserDocuments.Select(ud => ud.DocumentId).ToList();
        var docTitles = u.UserDocuments.Select(ud => ud.Document.Title).ToList();

        var primaryRoleId = roleIds.FirstOrDefault();
        var primaryRoleName = roleNames.FirstOrDefault() ?? u.Role?.Name ?? "User";

        return Ok(new UserListItemDto(
            u.Id,
            u.Username,
            u.Email,
            u.Department,
            u.PlantId,
            u.Plant?.PlantName,
            u.Plant?.PlantCode,
            primaryRoleId,
            primaryRoleName,
            roleIds,
            roleNames,
            docIds,
            docTitles,
            u.Theme.ToString(),
            u.CreatedAt
        ));
    }

    // 5. Granular RBAC: Create User (Multi-Role & Multi-Document)
    [HttpPost]
    [HasPermission("users.create")]
    public async Task<ActionResult<UserListItemDto>> CreateUser([FromBody] CreateUserRequest request)
    {
        var exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower() || u.Email.ToLower() == request.Email.ToLower());
        if (exists)
        {
            return BadRequest(new { message = "Username atau email sudah digunakan." });
        }

        var selectedRoleIds = request.RoleIds ?? new List<Guid>();
        if (request.RoleId.HasValue && !selectedRoleIds.Contains(request.RoleId.Value))
        {
            selectedRoleIds.Add(request.RoleId.Value);
        }

        if (!selectedRoleIds.Any())
        {
            return BadRequest(new { message = "Minimal 1 Identity & Access Governance (Role) wajib dipilih." });
        }

        var roles = await _context.Roles.Where(r => selectedRoleIds.Contains(r.Id)).ToListAsync();
        if (!roles.Any()) return BadRequest(new { message = "Role yang dipilih tidak ditemukan di sistem." });

        if (!string.IsNullOrWhiteSpace(request.PlantId))
        {
            var plantExists = await _context.Plants.AnyAsync(p => p.PlantId == request.PlantId);
            if (!plantExists) return BadRequest(new { message = $"Plant dengan ID {request.PlantId} tidak ditemukan." });
        }

        if (!Enum.TryParse<ThemePreference>(request.ThemePreference, true, out var parsedTheme))
        {
            parsedTheme = ThemePreference.Corporate;
        }

        var primaryRole = roles.First();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Department = request.Department,
            PlantId = string.IsNullOrWhiteSpace(request.PlantId) ? null : request.PlantId,
            RoleId = primaryRole.Id,
            Theme = parsedTheme,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var r in roles)
        {
            user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = r.Id });
        }

        if (request.DocumentIds != null && request.DocumentIds.Any())
        {
            var validDocs = await _context.Documents.Where(d => request.DocumentIds.Contains(d.Id)).ToListAsync();
            foreach (var doc in validDocs)
            {
                user.UserDocuments.Add(new UserDocument { UserId = user.Id, DocumentId = doc.Id });
            }
        }

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, await GetUserDtoById(user.Id));
    }

    // 6. Granular RBAC: Update User (Multi-Role & Multi-Document)
    [HttpPut("{id}")]
    [HasPermission("users.edit")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .Include(u => u.UserDocuments)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return NotFound(new { message = "User tidak ditemukan." });

        var selectedRoleIds = request.RoleIds ?? new List<Guid>();
        if (request.RoleId.HasValue && !selectedRoleIds.Contains(request.RoleId.Value))
        {
            selectedRoleIds.Add(request.RoleId.Value);
        }

        if (selectedRoleIds.Any())
        {
            var roles = await _context.Roles.Where(r => selectedRoleIds.Contains(r.Id)).ToListAsync();
            if (!roles.Any()) return BadRequest(new { message = "Role ID tidak ditemukan." });

            user.RoleId = roles.First().Id;
            _context.UserRoles.RemoveRange(user.UserRoles);
            foreach (var r in roles)
            {
                user.UserRoles.Add(new UserRole { UserId = id, RoleId = r.Id });
            }
        }

        if (request.DocumentIds != null)
        {
            _context.UserDocuments.RemoveRange(user.UserDocuments);
            var validDocs = await _context.Documents.Where(d => request.DocumentIds.Contains(d.Id)).ToListAsync();
            foreach (var doc in validDocs)
            {
                user.UserDocuments.Add(new UserDocument { UserId = id, DocumentId = doc.Id });
            }
        }

        if (!string.IsNullOrWhiteSpace(request.PlantId))
        {
            var plantExists = await _context.Plants.AnyAsync(p => p.PlantId == request.PlantId);
            if (!plantExists) return BadRequest(new { message = $"Plant dengan ID {request.PlantId} tidak ditemukan." });
        }

        if (!Enum.TryParse<ThemePreference>(request.ThemePreference, true, out var parsedTheme))
        {
            parsedTheme = ThemePreference.Corporate;
        }

        user.Email = request.Email;
        user.Department = request.Department;
        user.PlantId = string.IsNullOrWhiteSpace(request.PlantId) ? null : request.PlantId;
        user.Theme = parsedTheme;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await _context.SaveChangesAsync();

        return Ok(await GetUserDtoById(user.Id));
    }

    private async Task<UserListItemDto> GetUserDtoById(Guid id)
    {
        var u = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.UserDocuments).ThenInclude(ud => ud.Document)
            .Include(u => u.Plant)
            .FirstAsync(u => u.Id == id);

        var roleIds = u.UserRoles.Select(ur => ur.RoleId).ToList();
        var roleNames = u.UserRoles.Select(ur => ur.Role.Name).ToList();
        if (!roleIds.Any() && u.RoleId.HasValue)
        {
            roleIds.Add(u.RoleId.Value);
            if (u.Role != null) roleNames.Add(u.Role.Name);
        }

        var docIds = u.UserDocuments.Select(ud => ud.DocumentId).ToList();
        var docTitles = u.UserDocuments.Select(ud => ud.Document.Title).ToList();

        return new UserListItemDto(
            u.Id,
            u.Username,
            u.Email,
            u.Department,
            u.PlantId,
            u.Plant?.PlantName,
            u.Plant?.PlantCode,
            roleIds.FirstOrDefault(),
            roleNames.FirstOrDefault() ?? u.Role?.Name ?? "User",
            roleIds,
            roleNames,
            docIds,
            docTitles,
            u.Theme.ToString(),
            u.CreatedAt
        );
    }

    // 7. Granular RBAC: Delete User
    [HttpDelete("{id}")]
    [HasPermission("users.delete")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var currentUserId = GetCurrentUserId();
        if (id == currentUserId)
        {
            return BadRequest(new { message = "Anda tidak dapat menghapus akun Anda sendiri." });
        }

        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User tidak ditemukan." });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User berhasil dihapus.", id });
    }

    // 8. Excel Import/Export: Download Template Excel
    [HttpGet("template")]
    [HasPermission("users.create")]
    public async Task<IActionResult> DownloadTemplate()
    {
        using var workbook = new XLWorkbook();

        // 1. Sheet Users
        var wsUsers = workbook.Worksheets.Add("Users");
        string[] userHeaders = ["Username", "Email", "Password", "Department", "PlantCode", "DynamicRole", "ThemePreference"];
        for (int i = 0; i < userHeaders.Length; i++)
        {
            wsUsers.Cell(1, i + 1).Value = userHeaders[i];
        }
        var uHeader = wsUsers.Range(1, 1, 1, userHeaders.Length);
        uHeader.Style.Font.Bold = true;
        uHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#1677FF");
        uHeader.Style.Font.FontColor = XLColor.White;

        // Sample rows in Sheet Users
        wsUsers.Cell(2, 1).Value = "budi_santoso";
        wsUsers.Cell(2, 2).Value = "budi.santoso@example.com";
        wsUsers.Cell(2, 3).Value = "P@ssword123";
        wsUsers.Cell(2, 4).Value = "IT & Engineering";
        wsUsers.Cell(2, 5).Value = "JKT1";
        wsUsers.Cell(2, 6).Value = "Engineering Staff";
        wsUsers.Cell(2, 7).Value = "Corporate";

        wsUsers.Cell(3, 1).Value = "siti_aminah";
        wsUsers.Cell(3, 2).Value = "siti.aminah@example.com";
        wsUsers.Cell(3, 3).Value = "P@ssword123";
        wsUsers.Cell(3, 4).Value = "Finance";
        wsUsers.Cell(3, 5).Value = "SBY1";
        wsUsers.Cell(3, 6).Value = "Finance Staff";
        wsUsers.Cell(3, 7).Value = "Light";

        wsUsers.Columns().AdjustToContents();

        // 2. Sheet Documents
        var wsDocs = workbook.Worksheets.Add("Documents");
        string[] docHeaders = ["OwnerUsername", "Title", "Content", "Department", "Classification", "TargetPlantCodes"];
        for (int i = 0; i < docHeaders.Length; i++)
        {
            wsDocs.Cell(1, i + 1).Value = docHeaders[i];
        }
        var dHeader = wsDocs.Range(1, 1, 1, docHeaders.Length);
        dHeader.Style.Font.Bold = true;
        dHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#52C41A");
        dHeader.Style.Font.FontColor = XLColor.White;

        // Sample rows in Sheet Documents
        wsDocs.Cell(2, 1).Value = "budi_santoso";
        wsDocs.Cell(2, 2).Value = "Manual Instalasi Sensor IoT Pabrik";
        wsDocs.Cell(2, 3).Value = "Panduan operasional setup sensor suhu dan kelembaban pada line produksi.";
        wsDocs.Cell(2, 4).Value = "IT & Engineering";
        wsDocs.Cell(2, 5).Value = "Internal";
        wsDocs.Cell(2, 6).Value = "JKT1, BDO1"; // Multi-Plant reference!

        wsDocs.Cell(3, 1).Value = "siti_aminah";
        wsDocs.Cell(3, 2).Value = "Laporan Neraca Aset Pergudangan";
        wsDocs.Cell(3, 3).Value = "Rangkuman aset logistik dan inventaris barang kuartal berjalan.";
        wsDocs.Cell(3, 4).Value = "Finance";
        wsDocs.Cell(3, 5).Value = "Confidential";
        wsDocs.Cell(3, 6).Value = "SBY1";

        wsDocs.Columns().AdjustToContents();

        // 3. Sheet Reference Guide
        var wsRef = workbook.Worksheets.Add("System Reference");
        wsRef.Cell(1, 1).Value = "Available Plant Codes";
        wsRef.Cell(1, 2).Value = "Plant Name";
        wsRef.Cell(1, 3).Value = "Available Dynamic Roles";
        wsRef.Cell(1, 4).Value = "Departments";
        wsRef.Cell(1, 5).Value = "Classifications";

        var rHeader = wsRef.Range(1, 1, 1, 5);
        rHeader.Style.Font.Bold = true;
        rHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#FA8C16");
        rHeader.Style.Font.FontColor = XLColor.White;

        var plants = await _context.Plants.ToListAsync();
        for (int i = 0; i < plants.Count; i++)
        {
            wsRef.Cell(i + 2, 1).Value = plants[i].PlantCode;
            wsRef.Cell(i + 2, 2).Value = plants[i].PlantName;
        }

        var roles = await _context.Roles.ToListAsync();
        for (int i = 0; i < roles.Count; i++)
        {
            wsRef.Cell(i + 2, 3).Value = roles[i].Name;
        }

        string[] depts = ["Executive", "Finance", "IT & Engineering", "Operations"];
        for (int i = 0; i < depts.Length; i++)
        {
            wsRef.Cell(i + 2, 4).Value = depts[i];
        }

        string[] classifs = ["Public", "Internal", "Confidential"];
        for (int i = 0; i < classifs.Length; i++)
        {
            wsRef.Cell(i + 2, 5).Value = classifs[i];
        }

        wsRef.Columns().AdjustToContents();

        using var memoryStream = new MemoryStream();
        workbook.SaveAs(memoryStream);
        var bytes = memoryStream.ToArray();

        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Template_Import_User_Document_Role.xlsx");
    }

    // 9. Excel Import: Upload Users with Dynamic Roles & Documents
    [HttpPost("upload")]
    [HasPermission("users.create")]
    public async Task<IActionResult> UploadUsersFromExcel([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "File Excel (.xlsx) tidak ditemukan atau kosong." });
        }

        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Format file tidak didukung. Harap upload file berekstensi .xlsx" });
        }

        try
        {
            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);

            var roles = await _context.Roles.ToListAsync();
            var plants = await _context.Plants.ToListAsync();

            var usersCreated = 0;
            var usersSkipped = 0;
            var docsCreated = 0;
            var errors = new List<string>();

            var usernameToUserMap = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);

            // 1. Process Sheet Users
            var wsUsers = workbook.Worksheets.FirstOrDefault(w => w.Name.Equals("Users", StringComparison.OrdinalIgnoreCase))
                          ?? workbook.Worksheets.FirstOrDefault();

            if (wsUsers == null)
            {
                return BadRequest(new { message = "Sheet 'Users' tidak ditemukan di file Excel." });
            }

            var userLastRow = wsUsers.LastRowUsed()?.RowNumber() ?? 1;
            for (int r = 2; r <= userLastRow; r++)
            {
                var username = wsUsers.Cell(r, 1).GetString().Trim();
                var email = wsUsers.Cell(r, 2).GetString().Trim();
                var password = wsUsers.Cell(r, 3).GetString().Trim();
                var dept = wsUsers.Cell(r, 4).GetString().Trim();
                var plantCode = wsUsers.Cell(r, 5).GetString().Trim();
                var roleName = wsUsers.Cell(r, 6).GetString().Trim();
                var themeStr = wsUsers.Cell(r, 7).GetString().Trim();

                if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(email))
                {
                    continue; // skip empty line
                }

                // Check if user already exists
                var existsInDb = await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower() || u.Email.ToLower() == email.ToLower());
                if (existsInDb || usernameToUserMap.ContainsKey(username))
                {
                    usersSkipped++;
                    errors.Add($"Baris {r}: User '{username}' atau email '{email}' sudah ada di sistem, dilewati.");
                    continue;
                }

                var matchedRoles = new List<Role>();
                if (!string.IsNullOrWhiteSpace(roleName))
                {
                    var splittedRoles = roleName.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    foreach (var sRole in splittedRoles)
                    {
                        var foundRole = roles.FirstOrDefault(rl => rl.Name.Equals(sRole, StringComparison.OrdinalIgnoreCase));
                        if (foundRole != null) matchedRoles.Add(foundRole);
                    }
                }

                if (!matchedRoles.Any())
                {
                    errors.Add($"Baris {r}: Role '{roleName}' untuk user '{username}' tidak ditemukan.");
                    continue;
                }

                var plant = plants.FirstOrDefault(p => p.PlantCode.Equals(plantCode, StringComparison.OrdinalIgnoreCase) || p.PlantId.Equals(plantCode, StringComparison.OrdinalIgnoreCase));

                if (!Enum.TryParse<ThemePreference>(themeStr, true, out var theme))
                {
                    theme = ThemePreference.Corporate;
                }

                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Username = username,
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(string.IsNullOrWhiteSpace(password) ? "P@ssword123" : password),
                    Department = string.IsNullOrWhiteSpace(dept) ? "Operations" : dept,
                    PlantId = plant?.PlantId,
                    RoleId = matchedRoles.First().Id,
                    Theme = theme,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                foreach (var rRole in matchedRoles)
                {
                    user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = rRole.Id });
                }

                _context.Users.Add(user);
                usernameToUserMap[username] = user;
                usersCreated++;
            }

            await _context.SaveChangesAsync();

            // 2. Process Sheet Documents (if present)
            var wsDocs = workbook.Worksheets.FirstOrDefault(w => w.Name.Equals("Documents", StringComparison.OrdinalIgnoreCase));
            if (wsDocs != null)
            {
                var docLastRow = wsDocs.LastRowUsed()?.RowNumber() ?? 1;
                for (int r = 2; r <= docLastRow; r++)
                {
                    var ownerUsername = wsDocs.Cell(r, 1).GetString().Trim();
                    var title = wsDocs.Cell(r, 2).GetString().Trim();
                    var content = wsDocs.Cell(r, 3).GetString().Trim();
                    var dept = wsDocs.Cell(r, 4).GetString().Trim();
                    var classif = wsDocs.Cell(r, 5).GetString().Trim();
                    var targetPlantsRaw = wsDocs.Cell(r, 6).GetString().Trim();

                    if (string.IsNullOrWhiteSpace(title)) continue;

                    User? owner = null;
                    if (usernameToUserMap.TryGetValue(ownerUsername, out var mapUser))
                    {
                        owner = mapUser;
                    }
                    else
                    {
                        owner = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == ownerUsername.ToLower());
                    }

                    if (owner == null)
                    {
                        errors.Add($"Dokumen '{title}': Owner '{ownerUsername}' tidak ditemukan.");
                        continue;
                    }

                    var doc = new Document
                    {
                        Id = Guid.NewGuid(),
                        Title = title,
                        Content = content,
                        Department = string.IsNullOrWhiteSpace(dept) ? owner.Department : dept,
                        Classification = string.IsNullOrWhiteSpace(classif) ? "Internal" : classif,
                        OwnerId = owner.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    doc.UserDocuments.Add(new UserDocument { UserId = owner.Id, DocumentId = doc.Id });

                    if (!string.IsNullOrWhiteSpace(targetPlantsRaw))
                    {
                        var codes = targetPlantsRaw.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                        foreach (var code in codes)
                        {
                            var targetPlant = plants.FirstOrDefault(p => p.PlantCode.Equals(code, StringComparison.OrdinalIgnoreCase) || p.PlantId.Equals(code, StringComparison.OrdinalIgnoreCase));
                            if (targetPlant != null)
                            {
                                doc.DocumentPlants.Add(new DocumentPlant { DocumentId = doc.Id, PlantId = targetPlant.PlantId });
                            }
                        }
                    }

                    _context.Documents.Add(doc);
                    docsCreated++;
                }

                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                success = true,
                message = $"Import selesai: {usersCreated} user berhasil dibuat, {docsCreated} dokumen terbuat, {usersSkipped} user dilewati.",
                usersCreated,
                usersSkipped,
                documentsCreated = docsCreated,
                warnings = errors
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Gagal memproses file Excel: {ex.Message}" });
        }
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
