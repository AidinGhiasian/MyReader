using MR.Application.Contracts.Readers;
using MR.Infrastructure.Readers;
using MyReaderManagment.MR.Application.Readers.Services;

var builder = WebApplication.CreateBuilder(args);
// Add services to the container.
builder.Services.AddRazorPages();

var app = builder.Build();


builder.Services.AddScoped<IDocumentTypeDetector,DocumentTypeDetector>();
builder.Services.AddScoped<IDocumentReaderFactory, DocumentReaderFactory>();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages()
   .WithStaticAssets();

app.Run();
