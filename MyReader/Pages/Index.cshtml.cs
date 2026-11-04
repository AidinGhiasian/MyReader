using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MR.Application.Contracts.Readers;
using MR.Domain.Documents;
using Services.Application;

namespace MyReader.Pages
{
    public class IndexModel : PageModel
    {
        private readonly IDocumentTypeDetector _typeDetector;
        private readonly IDocumentReaderFactory _readerFactory;
        public IndexModel(IDocumentTypeDetector typeDetector,IDocumentReaderFactory readerFactory)
        {
            _typeDetector = typeDetector;
            _readerFactory = readerFactory;
        }
        public async Task<IActionResult> OnPostReadAsync(IFormFile? uploadedFile, CancellationToken cancellationToken)
        {
            OperationResult operation = new OperationResult();

            if (uploadedFile == null||uploadedFile.Length==0)
            {
                operation.Failure(ApplicationMessage.NotFound);
                return RedirectToPage();
            }

            string fileName = Path.GetFileName(uploadedFile.FileName);
            DocumentType documentType = _typeDetector.Detect(fileName);


            if (documentType==DocumentType.Unknown)
            {
                operation.Failure(ApplicationMessage.NotSupported);
                return RedirectToPage();
            }


            IDocumentReader? reader = _readerFactory.Create(documentType);
            if (reader==null)
            {
                operation.Failure(ApplicationMessage.OperationFailed);
                return RedirectToPage();
            }


            await using var stream = uploadedFile.OpenReadStream();
            DocumentReadResult result = await reader.ReadAsync(stream,fileName,cancellationToken);
            return File(result.Content, result.ContentType);
        }
    }
}
