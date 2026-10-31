namespace API.Controllers;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .Include(u => u.Plant)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Username atau password salah." });
        }

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

        var primaryRole = roleNames.FirstOrDefault() ?? user.Role?.Name ?? "User";
        var token = GenerateJwtToken(user, roleNames, permissions);

        var userProfile = new UserProfileDto(
            user.Id, 
            user.Username, 
            user.Email, 
            user.Department, 
            user.PlantId,
            user.Plant?.PlantName,
            user.Plant?.PlantCode,
            primaryRole,
            roleNames,
            permissions, 
            user.Theme.ToString()
        );

        return Ok(new AuthResponse(token, userProfile));
    }

    private string GenerateJwtToken(User user, List<string> roleNames, List<string> permissions)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "SUPER_SECRET_KEY_MIN_32_CHARACTERS_LONG_FOR_SECURITY!";
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var primaryRole = roleNames.FirstOrDefault() ?? user.Role?.Name ?? "User";
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, primaryRole),
            new Claim("department", user.Department),
            new Claim("plantId", user.PlantId ?? ""),
            new Claim("plantCode", user.Plant?.PlantCode ?? ""),
            new Claim("ThemePreference", user.Theme.ToString())
        };

        foreach (var r in roleNames)
        {
            if (r != primaryRole)
            {
                claims.Add(new Claim(ClaimTypes.Role, r));
            }
        }

        foreach (var perm in permissions)
        {
            claims.Add(new Claim("permission", perm));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "EnterpriseApi",
            audience: _configuration["Jwt:Audience"] ?? "EnterpriseUsers",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
