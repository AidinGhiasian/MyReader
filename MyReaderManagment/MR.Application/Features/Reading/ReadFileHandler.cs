using System;
using System.IO;

namespace MyReaderManagment.MR.Domain.Features.Reading
{
    //گرفتن فایل از کویری و انجام منطق برنامه  و خروجی دادن به صورت ریسالت
    public class ReadFileHandler
    {
        public ReadFileResult Handle(ReadFileQuery fileQuery)
        {
            return new ReadFileResult
            {
                FileName = fileQuery.FileName,
                FileStream = fileQuery.FileStream,
                FileType = GetContentType(fileQuery.FileName)
            };
        }
        private string GetContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension.ToLower() switch
            {
                ".txt" => "text/plain",
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xls" => "application/vnd.ms-excel",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };
        }
    }
}
