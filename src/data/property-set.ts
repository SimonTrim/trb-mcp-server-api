export const propertySetDocs = `# Property Set Service — Trimble Connect

## Introduction

BIM models used in construction contain model objects, each with geometry and properties that describe them in detail. These properties are grouped into property sets, which contain related properties.

The Property Set Service allows additional, editable properties from user-defined property set libraries to be linked to BIM models. Linking property sets to model objects requires that these objects be uniquely identified using GUIDs. The service also enables defining access control policies (read/write/no access) for different users at the property set level.

The Property Set Service is a data-level service with REST API capabilities, complemented by SDKs for Javascript and .NET.

## Available SDKs

| Platform | Package | URL |
|----------|---------|-----|
| JavaScript | trimble-connect-sdk | https://www.npmjs.com/package/trimble-connect-sdk |
| .NET | Trimble.Connect.PSet.Client | https://www.nuget.org/packages/Trimble.Connect.PSet.Client |
| .NET Docs | tc-dotnet-sdk-docs | https://github.com/trimble-oss/tc-dotnet-sdk-docs |
| Examples | tc-samples | https://github.com/trimble-oss/tc-samples |

## Use Cases

In the Trimble Connect ecosystem:
- Create property set libraries for various construction processes
- Define data schemas for custom properties
- Link property sets to BIM model objects
- View and edit property values
- Manage access control for different user groups

## Key Concepts

| Concept | Description |
|---------|-------------|
| Property Set Definition | Structure of a property set (name, description, data schema) |
| Property | Individual property (name, data type, value) |
| PSet | Abbreviation for Property Set |
| Library | Container for a collection of property set definitions |
| PSet Instance | Property set created from a definition |
| Version | Schemas and instances are versioned |
| Link | Property sets can be linked to external resources (FRN notation recommended) |

## Trimble Connect Conventions

To use Property Sets in the Trimble Connect ecosystem:
- Specific API and access control policy conventions must be followed
- Without these conventions, Property Sets will not be accessible in the TC project context
- A valid Trimble Connect license is required

## Postman Collection

https://documenter.getpostman.com/view/1957009/SVtVUoVB?version=latest
`;
