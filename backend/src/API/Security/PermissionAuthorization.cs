namespace API.Security;

using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

public class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission) : base(policy: permission) { }
}

public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }
}

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        // 1. Super Admin bypass (Super Admin has root access to everything)
        if (context.User.IsInRole("Super Admin"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // 2. Cek apakah user memiliki claim 'permission' dengan kode yang diminta
        var hasPermission = context.User.Claims.Any(c => 
            c.Type == "permission" && 
            string.Equals(c.Value, requirement.Permission, StringComparison.OrdinalIgnoreCase));

        if (hasPermission)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public class DynamicPermissionPolicyProvider : IAuthorizationPolicyProvider
{
    public DefaultAuthorizationPolicyProvider FallbackPolicyProvider { get; }

    public DynamicPermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        FallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => FallbackPolicyProvider.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => FallbackPolicyProvider.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        // Jika policy sudah terdaftar, gunakan bawaan
        var policy = new AuthorizationPolicyBuilder();
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new PermissionRequirement(policyName));
        return Task.FromResult<AuthorizationPolicy?>(policy.Build());
    }
}

