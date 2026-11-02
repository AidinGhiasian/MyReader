using MR.Application.Contracts.Readers;
using MR.Domain.Documents;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MyReaderManagment.MR.Infrastructure.Readers
{
    public class TextReader : IDocumentReader
    {
        public DocumentType SupportedType => DocumentType.Txt;

        public async Task<DocumentReadResult> ReadAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default)
        {
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream, cancellationToken);
            return new DocumentReadResult
            {
                FileName = fileName,
                Content = memoryStream.ToArray(),
                ContentType = "text/plain"
            };
        }
    }
}
