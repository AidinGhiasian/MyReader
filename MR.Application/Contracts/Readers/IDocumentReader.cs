using MR.Domain.Documents;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Text;
using System.Threading.Tasks;

namespace MR.Application.Contracts.Readers
{
    public interface IDocumentReader
    {
        DocumentType SupportedType { get; }
    }
}
