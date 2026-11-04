using MR.Domain.Documents;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MR.Application.Contracts.Readers
{
    public interface IDocumentReadingService
    {
        Task<DocumentReadResult?> ProcessAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default);
    }
}
