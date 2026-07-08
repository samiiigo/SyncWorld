# Security Notes

- Never commit Firebase service account keys or environment secrets.
- Use GitHub Secrets or a platform secret store for deploy credentials.
- Enforce App Check in production paths.
- Keep Firestore Security Rules and callable validations in version control.
- Prefer Admin SDK writes for authoritative room state.
