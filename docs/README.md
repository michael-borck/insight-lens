# InsightLens Documentation

This repository contains the complete documentation for InsightLens, a survey analysis tool for university lecturers.

## 📖 View the Documentation

**Live Documentation**: [https://insightlens.github.io/insight-lens/](https://insightlens.github.io/insight-lens/)

## 🚀 Quick Start

- **New Users**: Start with [Installation Guide](getting-started/installation.md)
- **Import Data**: Follow [Importing Data](essential-workflow/importing-data.md)
- **AI Setup**: Configure [AI Providers](ai-chat/setup-ai-providers.md)
- **Troubleshooting**: Check [Common Issues](troubleshooting/common-issues.md)

## 📚 Documentation Sections

### [Getting Started](getting-started/)
- [Installation Guide](getting-started/installation.md)
- [First Run Setup](getting-started/first-run.md)
- [Dashboard Overview](getting-started/dashboard-overview.md)
- [Sidebar Navigation](getting-started/sidebar-navigation.md)

### [Essential Workflow](essential-workflow/)
- [Importing Survey Data](essential-workflow/importing-data.md)
- [Exploring Trends](essential-workflow/exploring-trends.md)
- [Unit Filtering](essential-workflow/unit-filtering.md)

### [AI Chat Assistant](ai-chat/)
- [Setting Up AI Providers](ai-chat/setup-ai-providers.md)

### [Troubleshooting](troubleshooting/)
- [Common Issues](troubleshooting/common-issues.md)

### [Reference](reference/)
- [FAQ](reference/faq.md)
- [Glossary](reference/glossary.md)

## 🛠 Contributing to Documentation

### Local Development

1. **Fork this repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/insight-lens.git
   cd insight-lens/docs
   ```

3. **Install Jekyll** (optional, for local preview):
   ```bash
   gem install bundler jekyll
   bundle install
   bundle exec jekyll serve
   ```

4. **Edit documentation** files in Markdown
5. **Test locally** at http://localhost:4000
6. **Submit pull request** with your changes

### Documentation Standards

- **Use clear, concise language**
- **Include code examples** where appropriate
- **Add screenshots** for UI guidance
- **Test all instructions** before publishing
- **Follow existing structure** and formatting

### File Organization

```
docs/
├── index.md                    # Homepage
├── _config.yml                 # Jekyll configuration
├── getting-started/            # New user guides
├── essential-workflow/         # Core functionality
├── ai-chat/                   # AI features
├── data-management/           # Data handling
├── troubleshooting/           # Problem solving
├── reference/                 # Reference materials
└── assets/images/             # Screenshots and diagrams
```

## 📝 Writing Guidelines

### Markdown Formatting

- Use **bold** for UI elements and important terms
- Use `code` for commands, file names, and code snippets
- Use > for important notes and warnings
- Include TOC for long documents

### Screenshots

- Use consistent browser/OS for screenshots
- Highlight relevant UI elements
- Keep images under 500KB when possible
- Store in `assets/images/` directory

### Code Examples

```bash
# Use proper syntax highlighting
ollama pull llama3.2
```

Always test code examples before publishing.

## 🔍 Search and Navigation

The documentation includes:
- **Full-text search** powered by Jekyll
- **Cross-references** between related topics
- **Breadcrumb navigation** for context
- **Mobile-responsive** design

## 📞 Getting Help

- **Documentation Issues**: Create an issue in this repository
- **Feature Requests**: Use the main InsightLens repository
- **General Support**: Email support@insightlens.app
- **Community**: Join discussions in GitHub Discussions

## 📄 License

This documentation is released under the same MIT license as InsightLens.

---

Made with ❤️ for educators worldwide