using MR.Application.Contracts.Readers;
using MR.Domain.Documents;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MR.Infrastructure.Readers
{
    public class DocumentTypeDetector : IDocumentTypeDetector
    {
        public DocumentType Detect(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".pdf" => DocumentType.Pdf,
                ".txt" => DocumentType.Txt,
                ".doc" => DocumentType.Doc,
                ".docx" => DocumentType.Docx,
                ".rtf" => DocumentType.Rtf,
                ".odt" => DocumentType.Odt,
                ".epub" => DocumentType.Epub,
                ".md" => DocumentType.Markdown,
                ".html" => DocumentType.Html,
                ".csv" => DocumentType.Csv,
                ".xlsx" => DocumentType.Xlsx,
                _ => DocumentType.Unknoun,
            };
        }
    }
}
