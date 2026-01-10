import { Link } from "wouter";
import Logo from "@/components/Logo";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Logo />
              <span className="text-xl font-bold text-primary">SplitSheet</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
              <a href="/api/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</a>
              <a href="/api/login" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Get Started</a>
            </div>
            <div className="md:hidden">
              <button className="text-muted-foreground">
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Professional Music Contracts Made <span className="text-accent">Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Create lawyer-informed contracts for splits, performances, production, and management. 
              Built specifically for indie artists, producers, and music industry professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/api/login" className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors">
                Start Creating Contracts
              </a>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <i className="fas fa-play mr-2"></i>Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything You Need to Manage Music Contracts</h2>
            <p className="text-xl text-muted-foreground">Professional templates, secure storage, and collaboration tools all in one platform</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-file-contract text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Contract Templates</h3>
              <p className="text-muted-foreground">Lawyer-informed templates for split sheets, performance agreements, producer contracts, and management deals.</p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Collaboration</h3>
              <p className="text-muted-foreground">Share contracts, collect signatures, and collaborate with your team members seamlessly.</p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-shield-alt text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Storage</h3>
              <p className="text-muted-foreground">Bank-level encryption and secure cloud storage for all your important music industry contracts.</p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-download text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">PDF Export</h3>
              <p className="text-muted-foreground">Generate professional PDF documents ready for signatures and legal proceedings.</p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-credit-card text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Stripe Integration</h3>
              <p className="text-muted-foreground">Secure payment processing with flexible subscription tiers for individuals and labels.</p>
            </div>
            
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-mobile-alt text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Mobile Responsive</h3>
              <p className="text-muted-foreground">Access and manage your contracts from any device, anywhere in the world.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that fits your music career</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-card p-8 rounded-xl border border-border">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="text-4xl font-bold text-primary mb-2">$0</div>
                <p className="text-muted-foreground">Per month</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>3 contracts per month</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Basic templates</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>PDF export</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Email support</span>
                </li>
              </ul>
              <a href="/api/login" className="block w-full bg-secondary text-secondary-foreground py-3 rounded-lg font-semibold hover:bg-secondary/80 transition-colors text-center">
                Get Started
              </a>
            </div>
            
            {/* Pro Plan */}
            <div className="bg-card p-8 rounded-xl border-2 border-accent relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold text-primary mb-2">$19</div>
                <p className="text-muted-foreground">Per month</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Unlimited contracts</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>All contract templates</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Real-time collaboration</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Contract analytics</span>
                </li>
              </ul>
              <a href="/api/login" className="block w-full bg-accent text-accent-foreground py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors text-center">
                Start Pro Trial
              </a>
            </div>
            
            {/* Label Plan */}
            <div className="bg-card p-8 rounded-xl border border-border">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Label</h3>
                <div className="text-4xl font-bold text-primary mb-2">$49</div>
                <p className="text-muted-foreground">Per month</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Team management</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Custom templates</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-3"></i>
                  <span>Dedicated support</span>
                </li>
              </ul>
              <a href="/api/login" className="block w-full bg-secondary text-secondary-foreground py-3 rounded-lg font-semibold hover:bg-secondary/80 transition-colors text-center">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
