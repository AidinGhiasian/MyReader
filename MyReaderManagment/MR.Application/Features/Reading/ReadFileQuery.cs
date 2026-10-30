namespace MyReaderManagment.MR.Domain.Features.Reading
{
    //گرفتن فایل از کلاینت
    public class ReadFileQuery
    {
        public Stream FileStream { get; set; }
        public string FileName { get; set; }
    }
}
