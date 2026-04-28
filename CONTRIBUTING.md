# Contributing to GNAP OpenAPI Security Scheme

Thank you for your interest in contributing! This project is part of the ShujaaPay GNAP Stack, supported by the Interledger Foundation.

## How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or suggest improvements
- Include relevant context: OAS version, SDK generator, error messages

### Submitting Changes
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run schema validation tests (`node tests/validate-schema.js`)
5. Commit with clear messages
6. Open a Pull Request

### Areas Where We Need Help
- **Schema Review**: Validate the x-gnap JSON Schema against edge cases
- **SDK Generator Testing**: Test with OpenAPI Generator, Swagger Codegen, etc.
- **Documentation**: Improve examples and guides
- **OAS Proposal Feedback**: Review the draft TSC proposal

## Development Setup

```bash
git clone https://github.com/REN-100/gnap-openapi-security-scheme.git
cd gnap-openapi-security-scheme
npm install
npm test
```

## Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Please be respectful and constructive.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
