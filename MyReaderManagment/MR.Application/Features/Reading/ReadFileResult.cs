using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MyReaderManagment.MR.Domain.Features.Reading
{
    //تایین کننده خروجی های فایل مورد نظر
    public class ReadFileResult
    {
        public string FileName { get; set; }
        public Stream FileStream { get; set; }
        public string FileType { get; set; }
    }
}
