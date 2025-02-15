using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ApiDevopsIA.Controllers
{
    [Route("api/version")]
    [ApiController]
    public class VersionController : ControllerBase
    {
        private static readonly List<string> Versions = new()
        {
            "1.0.0", "1.1.0", "2.0.0"
        };

        [HttpGet]
        public IActionResult GetVersions()
        {
            return Ok(Versions);
        }

        [HttpPost]
        public IActionResult AddVersion([FromBody] string version)
        {
            if (string.IsNullOrWhiteSpace(version))
                return BadRequest("La versión no puede estar vacía.");

            Versions.Add(version);
            return Created($"api/version/{version}", version);
        }
    }
}
