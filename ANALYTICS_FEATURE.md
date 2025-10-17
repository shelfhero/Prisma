# AI-Powered Analytics Feature

## Overview
The Analytics feature provides intelligent, personalized insights and recommendations powered by OpenAI to help users save money and stay within their budgets.

## Features

### 1. **AI-Generated Insights**
- Uses OpenAI's GPT-4o-mini to analyze spending patterns
- Provides personalized recommendations in Bulgarian
- Identifies saving opportunities and budget warnings
- Analyzes spending trends week-over-week

### 2. **Smart User Detection**
- Detects new users (fewer than 5 receipts)
- Shows generic recommendations for new users
- Encourages users to upload more receipts for personalized insights
- Automatically switches to AI insights once enough data is available

### 3. **Insight Types**
- 🔴 **Budget Warnings** (High Priority) - Alerts when overspending
- 💰 **Saving Opportunities** (Medium/High) - Identifies areas to cut costs
- 📊 **Spending Patterns** (Medium) - Analyzes trends and habits
- 💡 **Recommendations** (Low/Medium) - General financial advice
- 🎯 **Goal Progress** (Medium) - Tracks progress toward budget goals
- 📈 **Category Insights** (Low/Medium) - Category-specific analysis

### 4. **Statistics Overview**
For users with sufficient data:
- Total receipts count
- Monthly spending total
- Top spending category
- Visual statistics dashboard

## Technical Implementation

### Database Schema
```sql
-- Table: user_insights
CREATE TABLE user_insights (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### API Endpoints

#### GET `/api/analytics`
Returns analytics data for the current user:
- Cached insights from database
- Statistics (total receipts, monthly spending, top categories)
- New user status
- Generic recommendations for new users

#### POST `/api/analytics/generate-insights`
Generates new AI-powered insights:
- Analyzes user spending data
- Calls OpenAI API for personalized recommendations
- Stores insights in database
- Returns updated analytics data

### OpenAI Integration

The system uses OpenAI's GPT-4o-mini model to generate insights:

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a financial advisor AI that provides personalized insights in Bulgarian.'
    },
    {
      role: 'user',
      content: prompt // Contains spending data
    }
  ],
  temperature: 0.7,
  max_tokens: 2000
})
```

### Data Sent to OpenAI
- Total receipts count
- Monthly spending total
- Monthly budget (if set)
- Week-over-week spending comparison
- Top 5 spending categories with amounts
- Spending trend percentage

**Note:** No personally identifiable information (PII) is sent to OpenAI.

## User Experience

### New Users (< 5 receipts)
1. See welcome message explaining the feature
2. Receive 4-5 generic recommendations about budgeting
3. Encouraged to upload more receipts
4. Button to quickly upload a receipt

### Established Users (≥ 5 receipts)
1. View statistics dashboard
2. See cached insights from previous generation
3. Click "Generate AI Insights" button for fresh analysis
4. Insights displayed with priority badges and icons
5. Color-coded by priority (red/yellow/green)

## Generic Recommendations

For new users, the system provides helpful starter tips:
1. **Start Tracking** - Upload receipts regularly
2. **Set Budget** - Create monthly budget limits
3. **Categorize Spending** - Organize purchases by category
4. **Watch Trends** - Understand where money goes
5. **Regular Reviews** - Check monthly statistics

## Security & Privacy

### Data Protection
- User insights stored with RLS (Row Level Security)
- Users can only access their own insights
- Insights auto-deleted after 30 days
- No PII sent to OpenAI API

### Environment Variables Required
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## UI Components

### Analytics Page (`/analytics`)
- Header with user stats
- "Generate AI Insights" button
- Statistics grid (for established users)
- Insights cards with priority indicators
- Back navigation
- Responsive design

### Dashboard Integration
The "Анализи" button on the dashboard now links to `/analytics` and shows:
- Updated description: "AI препоръки и smart insights за спестяване"
- Purple theme with analytics icon
- Receipt count for established users

## Cost Optimization

### OpenAI API Usage
- Uses GPT-4o-mini (most cost-effective model)
- Insights cached in database
- Only regenerates on user request
- Typical cost: ~$0.001-0.002 per insight generation

### Database Optimization
- Automatic cleanup of old insights (30+ days)
- Limited to 10 insights per request
- Indexed queries for fast retrieval

## Future Enhancements

### Potential Improvements
1. **Scheduled Insights** - Weekly/monthly automated insights
2. **Comparison Analytics** - Compare with similar users
3. **Goal Setting** - AI-assisted budget goal creation
4. **Predictive Analysis** - Forecast future spending
5. **Multi-language Support** - Additional languages
6. **Email Reports** - Send insights via email
7. **Integration with Budget** - Direct link to adjust budgets

### Advanced Features
- Category-specific deep dives
- Seasonal spending analysis
- Receipt anomaly detection
- Vendor comparison and recommendations
- Smart shopping lists

## Testing

### Test New User Flow
1. Create new account
2. Navigate to `/analytics`
3. Verify generic recommendations appear
4. Upload 5+ receipts
5. Regenerate insights
6. Verify AI insights appear

### Test Established User Flow
1. Login with account having 5+ receipts
2. Navigate to `/analytics`
3. Verify statistics display
4. Click "Generate AI Insights"
5. Verify new insights generated
6. Check database for stored insights

## Troubleshooting

### Common Issues

**Issue:** OpenAI API returns error
- Check OPENAI_API_KEY is set correctly
- Verify API key has credits
- Check API rate limits
- Fallback: Shows generic recommendations

**Issue:** No insights displayed
- Check user has uploaded receipts
- Verify database migration ran successfully
- Check RLS policies are correct
- Look for errors in browser console

**Issue:** Insights in wrong language
- Verify OpenAI system prompt is in Bulgarian
- Check model is using correct temperature
- Review generated JSON response

## Deployment Checklist

- [ ] Database migration applied (`019_user_insights.sql`)
- [ ] OpenAI API key added to environment variables
- [ ] `openai` package installed (`npm install openai`)
- [ ] Analytics page accessible at `/analytics`
- [ ] Dashboard button updated to link to analytics
- [ ] RLS policies enabled and tested
- [ ] Error handling tested
- [ ] New user flow tested
- [ ] Established user flow tested

## Monitoring

### Metrics to Track
- Number of insight generations per day
- OpenAI API costs
- User engagement with insights
- Database storage usage
- API response times
- Error rates

### Logs to Monitor
- OpenAI API errors
- Database insert/query errors
- User authentication issues
- Insight generation failures
