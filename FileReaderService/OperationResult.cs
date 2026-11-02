namespace Services.Application
{
    public class OperationResult
    {
        public bool Succeeded { get; set; }
        public bool Failed { get; set; }



        public string Message { get; set; }

        public OperationResult()
        {
            Succeeded = false;
        }

        public OperationResult Successful(string message = "عملیات با موفقیت انجام شد.")
        {
            Succeeded = true;
            Failed = false;
            return this;
        }

        public OperationResult Failure(string message)
        {
            Failed = true; 
            return this;
        }
    }
}
