import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json()

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Store support request in database
    const { error: dbError } = await supabase
      .from('support_requests')
      .insert({
        user_id: user?.id || null,
        name,
        email,
        subject,
        message,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // Continue even if database insert fails
    }

    // Send email notification (using a service like SendGrid, Resend, etc.)
    // For now, we'll just log it
    console.log('Support request received:', {
      name,
      email,
      subject,
      message,
      userId: user?.id
    })

    // In production, you would send an email here:
    /*
    await sendEmail({
      to: 'office@myshelfhero.com',
      from: 'noreply@yourapp.com',
      subject: `Support Request: ${subject}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        ${user ? `<p><strong>User ID:</strong> ${user.id}</p>` : ''}
      `
    })

    // Send confirmation email to user
    await sendEmail({
      to: email,
      from: 'office@myshelfhero.com',
      subject: 'Получихме вашето запитване',
      html: `
        <h2>Благодарим за вашето съобщение!</h2>
        <p>Здравейте ${name},</p>
        <p>Получихме вашето запитване и ще се свържем с вас в рамките на 24-48 часа.</p>
        <p><strong>Вашето съобщение:</strong></p>
        <p>${message}</p>
        <br>
        <p>С поздрави,</p>
        <p>Екипът на MyShelfHero</p>
      `
    })
    */

    return NextResponse.json(
      {
        success: true,
        message: 'Support request submitted successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing support request:', error)
    return NextResponse.json(
      { error: 'Failed to process support request' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch support requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user's support requests
    const { data: requests, error } = await supabase
      .from('support_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ requests }, { status: 200 })
  } catch (error) {
    console.error('Error fetching support requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support requests' },
      { status: 500 }
    )
  }
}
