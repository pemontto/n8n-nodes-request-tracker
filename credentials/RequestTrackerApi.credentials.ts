import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	IAuthenticateGeneric,
	Icon,
} from 'n8n-workflow';

export class RequestTrackerApi implements ICredentialType {
	name = 'requestTrackerApi';
	displayName = 'Request Tracker API';
	icon: Icon = { light: 'file:../icons/request-tracker.svg', dark: 'file:../icons/request-tracker.dark.svg' };
	documentationUrl = 'https://docs.bestpractical.com/rt/5/RT/REST2.html'; // Or a more specific internal doc if available
	properties: INodeProperties[] = [
		{
			displayName: 'RT Instance URL',
			name: 'rtInstanceUrl',
			type: 'string',
			default: '',
			placeholder: 'https://rt.example.com',
			description: 'The base URL of your Request Tracker instance (e.g., https://rt.example.com/rt)',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			description: 'Your Request Tracker API token',
		},
		// eslint-disable-next-line @n8n/community-nodes/credential-password-field
		{
			displayName: 'Ignore TLS Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to allow requests to RT instances with self-signed or expired SSL certificates',
		},
	];

	// This allows the credential to be used by other parts of n8n
	// (e.g. HTTP Request node) by defining how to inject authentication.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				// Sets the Authorization header for requests using these credentials.
				// The format for RT is "token <API_TOKEN>"
				'Authorization': '=token {{ $credentials.apiToken }}',
			},
			// skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
	};

	// Makes this credential available in the HTTP Request node
	httpRequestNode = {
		name: 'Request Tracker',
		docsUrl: 'https://docs.bestpractical.com/rt/5/RT/REST2.html',
		apiBaseUrlPlaceholder: 'https://rt.example.com/REST/2.0',
	};

	// The "test" method allows n8n to verify if the credential is valid.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.rtInstanceUrl }}',
			url: '/REST/2.0/rt', // Standard RT endpoint produces system information
			skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
	};
}