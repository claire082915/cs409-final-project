import { Link } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Logo from '../components/Logo.jsx'
import '../styles/pages/sign-up-login.css'

export default function SignUpLoginPage() {
  return (
    <div className='site-outer'>
      <Logo />
      <div className='welcome'>
        <p>Welcome to Lender</p>
        <p>Create an account or log in to start borrowing and lending.</p>
        <img></img>
      </div>
      <div className='sign-up'>
        <p>Sign Up</p>
        <p>Full Name</p>
        <input type="text" id="full-name" name="full-name" placeholder="Enter your name"></input>
        <p>Email</p>
        <input type="text" id="email" name="email" placeholder="Enter your email"></input>
        <p>Password</p>
        <input type="text" id="password" name="password" placeholder="Create password"></input>
        <Button to="/dashboard">
          Sign Up
        </Button>
        <Link className="login-link" to="/login">
          Already have an account? Log in
        </Link>
      </div>
      <div className='login'>
        <p>Log In</p>
        <p>Email</p>
        <input type="text" id="email" name="email" placeholder="Enter your email"></input>
        <p>Password</p>
        <input type="text" id="password" name="password" placeholder="Enter your password"></input>
        <Button to="/dashboard">
          Log In
        </Button>
      </div>
    </div>
    // <PagePlaceholder
    //   title="Sign up / Log in"
    //   description="Account forms for creating an account and returning to Lendr."
    //   withSidebar={false}
    // />
  )
}
