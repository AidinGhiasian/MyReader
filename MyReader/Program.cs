using MR.Application.Contracts.Readers;
using MR.Infrastructure.Readers;
using MyReaderManagment.MR.Application.Readers.Services;
using MyReaderManagment.MR.Infrastructure.Readers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();

// Dependency Injection
builder.Services.AddScoped<IDocumentTypeDetector, DocumentTypeDetector>();
builder.Services.AddScoped<IDocumentReaderFactory, DocumentReaderFactory>();
builder.Services.AddScoped<IDocumentReader, PdfReader>();
builder.Services.AddScoped<IDocumentReader, MyReaderManagment.MR.Infrastructure.Readers.TextReader>();
builder.Services.AddScoped<IDocumentReader, WordReader>();
builder.Services.AddScoped<IDocumentReader, SpreadsheetReader>();



var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages()
   .WithStaticAssets();

app.Run();