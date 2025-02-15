using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace WebApplication1.Controllers
{
    [RoutePrefix("api/version")]
    public class VersionController : ApiController
    {
        private static readonly List<string> Versions = new List<string>
        {
            "1.0.0", "1.1.0", "2.0.0"
        };

        // GET: api/version
        [HttpGet]
        [Route("")]
        public IHttpActionResult GetVersions()
        {
            return Ok(Versions);
        }

        // POST: api/version
        [HttpPost]
        [Route("")]
        public IHttpActionResult AddVersion([FromBody] string version)
        {
            if (string.IsNullOrWhiteSpace(version))
                return BadRequest("La versión no puede estar vacía.");

            Versions.Add(version);
            return Created($"api/version/{version}", version);
        }
    }
}
