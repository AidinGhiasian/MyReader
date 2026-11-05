using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MR.Application.Contracts.Readers;
using MR.Domain.Documents;
using Services.Application;

namespace MyReader.Pages
{
    public class IndexModel : PageModel
    {
        private readonly IDocumentReadingService _readingService;
        public IndexModel(IDocumentReadingService readingService)
        {
            _readingService = readingService;
        }
        public async Task<IActionResult> OnPostReadAsync(IFormFile? uploadedFile, CancellationToken cancellationToken)
        {
            OperationResult operation = new OperationResult();

            if (uploadedFile == null||uploadedFile.Length==0)
            {
                operation.Failure(ApplicationMessage.NotFound);
                operation.Message = ApplicationMessage.NotFound;

                return BadRequest(operation);
            }

            string fileName = Path.GetFileName(uploadedFile.FileName);

            await using var stream = uploadedFile.OpenReadStream();
            DocumentReadResult? result = await _readingService.ProcessAsync(stream, fileName, cancellationToken);

            if(result==null)
            {
                operation.Failure(ApplicationMessage.OperationFailed);
                operation.Message = ApplicationMessage.OperationFailed;

                return BadRequest(operation);
            }
            return File(result.Content, result.ContentType);
        }
    }
}
