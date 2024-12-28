// src/app/api/config/route.ts
import { NextResponse } from 'next/server';
import { DirectoryManager } from '@/lib/utils/directory';
import type { ConfigParams } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = body.params as ConfigParams;

    // Basic validation
    if (!params?.orgKey || !params?.moduleKey || !params?.industry) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Clean the parameters
    const cleanParams = {
      ...params,
      // Replace spaces with underscores for file system compatibility
      industry: params.industry.replace(/\s+/g, '_'),
      subIndustry: params.subIndustry ? params.subIndustry.replace(/\s+/g, '_') : ''
    };

    const dirManager = new DirectoryManager();
    
    try {
      const hasConfig = await dirManager.checkUserConfig(cleanParams.orgKey, cleanParams.moduleKey);
      
      return NextResponse.json({
        exists: hasConfig,
        type: 'user',
        message: hasConfig ? 'Configuration found' : 'No configuration found'
      });
    } catch (error) {
      console.error('Directory manager error:', error);
      return NextResponse.json(
        { error: 'Failed to check configuration' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing configuration check:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}