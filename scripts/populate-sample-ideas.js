#!/usr/bin/env node

/**
 * Script to populate the database with sample ideas for Ideas Tinder
 * Run this script to add 20 diverse sample ideas to your Supabase database
 * 
 * Usage: node scripts/populate-sample-ideas.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please add these to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sampleIdeas = [
  // Community & Social
  {
    title: 'Community Garden',
    description: 'A shared space for neighbors to grow fresh food together',
    statement: 'Should we create a community garden in our neighborhood?',
    type: 'question',
    category: 'community',
    tags: ['community', 'gardening', 'sustainability']
  },
  {
    title: 'Weekly Potluck',
    description: 'Regular gatherings to build stronger community connections',
    statement: 'We should organize weekly potluck dinners to bring neighbors together',
    type: 'statement',
    category: 'events',
    tags: ['community', 'food', 'social']
  },
  {
    title: 'Neighborhood Watch',
    description: 'Community safety program to look out for each other',
    statement: 'Should we establish a neighborhood watch program?',
    type: 'proposal',
    category: 'community',
    tags: ['safety', 'community', 'security']
  },
  {
    title: 'Block Party',
    description: 'Annual celebration to strengthen neighborhood bonds',
    statement: 'We should organize an annual block party for the whole neighborhood',
    type: 'statement',
    category: 'events',
    tags: ['community', 'celebration', 'social']
  },
  
  // Technology & Innovation
  {
    title: 'Tech Workshops',
    description: 'Educational sessions on modern technology and digital skills',
    statement: 'Should we offer free coding workshops for community members?',
    type: 'proposal',
    category: 'tech',
    tags: ['education', 'technology', 'workshops']
  },
  {
    title: 'Community App',
    description: 'A mobile app to connect neighbors and share resources',
    statement: 'We should develop a community app for sharing tools and services',
    type: 'proposal',
    category: 'tech',
    tags: ['technology', 'community', 'sharing']
  },
  {
    title: 'Digital Literacy',
    description: 'Programs to help seniors learn technology',
    statement: 'Should we offer digital literacy classes for seniors?',
    type: 'question',
    category: 'tech',
    tags: ['education', 'seniors', 'technology']
  },
  {
    title: 'Smart Home Network',
    description: 'Connected devices for energy efficiency and security',
    statement: 'We should create a smart home network for energy savings',
    type: 'proposal',
    category: 'tech',
    tags: ['technology', 'energy', 'efficiency']
  },
  
  // Environment & Sustainability
  {
    title: 'Solar Initiative',
    description: 'Community-wide solar panel installation program',
    statement: 'Should we organize a group solar panel installation program?',
    type: 'proposal',
    category: 'projects',
    tags: ['solar', 'environment', 'energy']
  },
  {
    title: 'Composting Program',
    description: 'Shared composting system for organic waste',
    statement: 'We should start a community composting program',
    type: 'statement',
    category: 'community',
    tags: ['composting', 'environment', 'sustainability']
  },
  {
    title: 'Tree Planting',
    description: 'Annual tree planting to improve air quality',
    statement: 'Should we organize annual tree planting events?',
    type: 'question',
    category: 'projects',
    tags: ['trees', 'environment', 'air-quality']
  },
  {
    title: 'Electric Vehicle Charging',
    description: 'Community EV charging stations',
    statement: 'We should install electric vehicle charging stations',
    type: 'proposal',
    category: 'tech',
    tags: ['electric-vehicles', 'infrastructure', 'environment']
  },
  
  // Arts & Culture
  {
    title: 'Community Art Mural',
    description: 'Collaborative mural to beautify the neighborhood',
    statement: 'Should we create a community art mural?',
    type: 'question',
    category: 'projects',
    tags: ['art', 'beautification', 'community']
  },
  {
    title: 'Local Music Festival',
    description: 'Annual festival showcasing local musicians',
    statement: 'We should organize an annual local music festival',
    type: 'proposal',
    category: 'events',
    tags: ['music', 'festival', 'local-artists']
  },
  {
    title: 'Book Exchange',
    description: 'Little free library system for book sharing',
    statement: 'Should we install little free libraries throughout the neighborhood?',
    type: 'question',
    category: 'community',
    tags: ['books', 'education', 'sharing']
  },
  
  // Health & Wellness
  {
    title: 'Community Fitness Classes',
    description: 'Free fitness classes in the park',
    statement: 'We should offer free fitness classes in the community park',
    type: 'statement',
    category: 'events',
    tags: ['fitness', 'health', 'community']
  },
  {
    title: 'Mental Health Support',
    description: 'Support group for mental health and wellness',
    statement: 'Should we create a mental health support group?',
    type: 'question',
    category: 'community',
    tags: ['mental-health', 'support', 'wellness']
  },
  {
    title: 'Community Kitchen',
    description: 'Shared kitchen space for cooking classes and events',
    statement: 'We should build a community kitchen for cooking events',
    type: 'proposal',
    category: 'projects',
    tags: ['cooking', 'community', 'education']
  },
  
  // Transportation & Infrastructure
  {
    title: 'Bike Sharing Program',
    description: 'Community bike sharing for local transportation',
    statement: 'Should we start a community bike sharing program?',
    type: 'proposal',
    category: 'projects',
    tags: ['bikes', 'transportation', 'environment']
  },
  {
    title: 'Sidewalk Improvements',
    description: 'Better sidewalks for walking and accessibility',
    statement: 'We should improve sidewalks for better accessibility',
    type: 'statement',
    category: 'projects',
    tags: ['infrastructure', 'accessibility', 'walking']
  },
  {
    title: 'Public Transportation',
    description: 'Advocate for better public transportation options',
    statement: 'Should we advocate for improved public transportation?',
    type: 'question',
    category: 'projects',
    tags: ['transportation', 'advocacy', 'public-transit']
  }
];

async function populateSampleIdeas() {
  console.log('🌱 Starting to populate database with sample ideas...');
  
  try {
    // Check if ideas already exist
    const { data: existingIdeas, error: checkError } = await supabase
      .from('ideas')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking existing ideas:', checkError);
      return;
    }
    
    if (existingIdeas && existingIdeas.length > 0) {
      console.log('ℹ️  Ideas already exist in database. Skipping population.');
      console.log('   If you want to add more ideas, please delete existing ones first or modify this script.');
      return;
    }
    
    // Insert all sample ideas
    const { data, error } = await supabase
      .from('ideas')
      .insert(sampleIdeas);
    
    if (error) {
      console.error('❌ Error inserting sample ideas:', error);
      return;
    }
    
    console.log('✅ Successfully added', sampleIdeas.length, 'sample ideas to the database!');
    console.log('');
    console.log('🎯 Sample ideas include:');
    console.log('   • Community & Social (4 ideas)');
    console.log('   • Technology & Innovation (4 ideas)');
    console.log('   • Environment & Sustainability (4 ideas)');
    console.log('   • Arts & Culture (3 ideas)');
    console.log('   • Health & Wellness (3 ideas)');
    console.log('   • Transportation & Infrastructure (3 ideas)');
    console.log('');
    console.log('🚀 You can now visit your Ideas Tinder page to start voting!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the script
populateSampleIdeas();
