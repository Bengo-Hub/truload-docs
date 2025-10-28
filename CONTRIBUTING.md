# Contributing to TruLoad Documentation

Thank you for your interest in improving the TruLoad documentation!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/truload-docs.git
   cd truload-docs
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a branch:
   ```bash
   git checkout -b docs/your-feature-name
   ```

## Documentation Structure

- `docs/getting-started/` - Installation and setup guides
- `docs/user-manual/` - End-user documentation
- `docs/technical/` - Technical and API documentation
- `docs/testing/` - Testing documentation
- `docs/legal/` - Legal and compliance information
- `docs/support/` - Support resources

## Writing Guidelines

### Style Guide

1. **Clear and Concise**: Use simple language
2. **Active Voice**: "Click the button" not "The button should be clicked"
3. **Present Tense**: "The system validates" not "The system will validate"
4. **Consistent Terminology**: Use the same terms throughout
5. **Step-by-Step**: Break down complex tasks into steps

### Formatting

- Use ATX-style headers (`# Header`)
- Use fenced code blocks with language tags
- Include alt text for images
- Use admonitions for important notes

### Code Examples

```markdown
```python
# Always include comments
def example_function():
    """Include docstrings"""
    return "Clear example"
```
```

### Screenshots

- Use PNG format
- Crop to relevant area
- Highlight important elements
- Name descriptively: `weighing-start-screen.png`
- Store in `docs/assets/screenshots/`

## Testing Your Changes

1. Build locally:
   ```bash
   mkdocs serve
   ```
2. Open http://localhost:8000
3. Verify all links work
4. Check navigation
5. Review formatting

## Submitting Changes

1. Commit your changes:
   ```bash
   git add .
   git commit -m "docs: Add weighing module guide"
   ```
2. Push to your fork:
   ```bash
   git push origin docs/your-feature-name
   ```
3. Create a Pull Request

### PR Guidelines

- Clear title describing the change
- Description of what was added/changed
- Link to related issues
- Screenshots for visual changes

## Review Process

1. Automated checks run on PR
2. Documentation team reviews
3. Feedback addressed
4. Merged to `main`
5. Auto-deployed to live site

## Questions?

- Open an issue
- Email: docs@truload.example.com
- Slack: #truload-docs

Thank you for contributing! 🎉

