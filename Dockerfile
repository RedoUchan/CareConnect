# Base runtime stage (.NET 8.0 ASP.NET Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Development
ENV Jwt__Key="CareConnect_ICTU_Cloud_Production_Secret_Key_2026_Secure!"

# Build stage (.NET 8.0 SDK)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["web.csproj", "./"]
RUN dotnet restore "web.csproj"
COPY . .
RUN dotnet build "web.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "web.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final production image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
RUN chmod -R 777 /app

ENTRYPOINT ["dotnet", "web.dll"]
