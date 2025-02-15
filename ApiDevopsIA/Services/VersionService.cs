using ApiDevopsIA.Model;
using Dapper;
using System.Data;
namespace ApiDevopsIA.Services
{
    public class VersionService
    {
        private readonly IDbConnection _dbConnection;

        public VersionService(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<VersionModel>> GetAllVersionsAsync()
        {
            var query = "SELECT Id, VersionNumber, ReleaseDate, Description FROM Versions";
            return await _dbConnection.QueryAsync<VersionModel>(query);
        }

        public async Task<int> AddVersionAsync(VersionModel version)
        {
            var query = "INSERT INTO Versions (VersionNumber, ReleaseDate, Description) VALUES (@VersionNumber, @ReleaseDate, @Description); SELECT CAST(SCOPE_IDENTITY() as int);";
            return await _dbConnection.ExecuteScalarAsync<int>(query, version);
        }
    }
}
