using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web.Data;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [ApiExplorerSettings(GroupName = "appointments")]
    public class BranchesController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public BranchesController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetBranches()
        {
            var branches = await _dbContext.Branches.ToListAsync();
            return Ok(branches);
        }
    }
}
