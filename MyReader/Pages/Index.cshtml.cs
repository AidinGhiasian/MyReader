using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MyReaderManagment.MR.Application.Features.Reading;
using System.Security.Cryptography;

namespace MyReader.Pages
{
    public class IndexModel : PageModel
    {
        public IFormFile UploadedFile { get; set; }

        public IActionResult OnPost(IFormFile uploadedFile)
        {
            if (uploadedFile == null || UploadedFile.Length == 0)
            {
                return Page();

            }
            var query = new ReadFileQuery
            {
                FileName = uploadedFile.FileName,
                FileStream = uploadedFile.OpenReadStream(),
            };
            var handler = new ReadFileHandler();
            var result = handler.Handle(query);
            if (result.FileType == "text/plain")
            {
                using var reader = new StreamReader(result.FileStream);
                var content = reader.ReadToEnd();
                return Content(content,"text/plain");
            }
            return new FileStreamResult(result.FileStream, result.FileType);
        }
    }
}
