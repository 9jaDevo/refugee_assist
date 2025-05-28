# RefugeeAssist Platform

A comprehensive web platform designed to help refugees find and access vital services across multiple languages. The platform connects refugees with essential services like medical care, shelter, legal aid, food assistance, and educational resources.

## Key Features

### Multi-lingual Chat Assistant
- Natural language understanding in 15+ languages
- Real-time translation support
- Smart service recommendations based on user needs
- Location-aware suggestions
- Contextual conversation flow
- Support for voice input (where available)

### Interactive Service Map
- Real-time service location visualization
- Advanced marker clustering
- Multi-source service data integration:
  - Verified local services
  - OpenStreetMap integration
  - Google Places integration
- Comprehensive filtering options:
  - Service type
  - Language support
  - Geographic radius
- Color-coded service markers
- Detailed service information cards
- One-click directions

### Volunteer Dashboard
- Secure authentication system
- Comprehensive service management
- Real-time analytics:
  - Service distribution by type
  - Language coverage analysis
  - Geographic distribution
  - Usage patterns
- Data export capabilities:
  - CSV export for detailed analysis
  - PDF reports
- Bulk service import/export
- Multi-language service entry

### Progressive Web App
- Offline-first architecture
- Automatic background sync
- Push notifications support
- Installable on all devices
- Automatic updates

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Chart.js for analytics
- Progressive Web App (PWA) support

### Backend
- Supabase (PostgreSQL)
- Real-time subscriptions
- Row Level Security (RLS)
- PostGIS for geospatial queries
- Edge Functions for serverless computing

### Authentication
- Supabase Auth
- Secure email/password authentication
- Role-based access control

### Maps & Geocoding
- Google Maps Platform
- Advanced marker clustering
- Reverse geocoding
- Multi-provider fallback system

### Translation & NLP
- Real-time translation support
- Intent classification
- Multi-language processing
- Voice input processing

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account
- Google Maps API key

### Environment Setup

Create a `.env` file in the project root:

\`\`\`env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
\`\`\`

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/refugee-assist.git
   cd refugee-assist
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

### Supabase Setup

1. Create a new Supabase project
2. Connect to your project using the "Connect to Supabase" button
3. The database schema will be automatically created
4. Enable required Supabase services:
   - Authentication
   - Database
   - Edge Functions
   - Real-time subscriptions

## Service Types

The platform supports these service categories:

- 🏥 Medical Clinics
- 🏠 Shelters
- ⚖️ Legal Aid
- 🍲 Food Banks
- 📚 Educational Resources
- 🌐 Other Services

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- Arabic (ar)
- Ukrainian (uk)
- Russian (ru)
- German (de)
- Chinese (zh)
- Persian (fa)
- Turkish (tr)
- Swahili (sw)
- Hindi (hi)
- Urdu (ur)
- Pashto (ps)
- Somali (so)

## Security Features

- Row Level Security (RLS) for all database tables
- Secure authentication flow
- API key protection
- Rate limiting
- CORS protection
- Data encryption at rest

## Deployment

1. Build the project:
   \`\`\`bash
   npm run build
   \`\`\`

2. Deploy to Netlify:
   - Connect your repository
   - Set environment variables
   - Enable automatic deployments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers directly.

## Acknowledgments

- Google Maps Platform
- OpenStreetMap Contributors
- Supabase Team
- All contributors and volunteers