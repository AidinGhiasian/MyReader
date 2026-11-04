using MR.Application.Contracts.Readers;
using MR.Domain.Documents;
using Services.Application;

namespace MR.Application.Services
{
    public class DocumentReadingService : IDocumentReadingService
    {
        private readonly IDocumentTypeDetector _typeDetector;
        private readonly IDocumentReaderFactory _readerFactory;

        public DocumentReadingService(
            IDocumentTypeDetector typeDetector,
            IDocumentReaderFactory readerFactory)
        {
            _typeDetector = typeDetector;
            _readerFactory = readerFactory;
        }

        public async Task<DocumentReadResult?> ProcessAsync(Stream fileStream,string fileName,CancellationToken cancellationToken = default)
        {
            var result = new OperationResult();
            DocumentType documentType = _typeDetector.Detect(fileName);

            if (documentType == DocumentType.Unknown)
            {
                return null;
            }
            IDocumentReader? reader = _readerFactory.Create(documentType);

            if (reader == null)
            {
                return null;
            }

            return await reader.ReadAsync(fileStream,fileName,cancellationToken);
        }
    }
}