using MR.Application.Contracts.Readers;
using MR.Domain.Documents;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MyReaderManagment.MR.Application.Readers.Services
{
    public class DocumentReaderFactory:IDocumentReaderFactory
    {
        private readonly IEnumerable<IDocumentReader> _readers;
        public DocumentReaderFactory(IEnumerable<IDocumentReader>readers)
        {
            _readers = readers;
        }
        public IDocumentReader? Create(DocumentType documentType)
        {
            return _readers.FirstOrDefault(readers => readers.SupportedType == documentType);
        }
    }
}
