#include "stdafx.h"
#include <winsock2.h>
#include <ws2bth.h>

int _tmain(int argc, _TCHAR* argv[])
{
    // setup windows sockets
    WORD wVersionRequested;
    WSADATA wsaData;
    wVersionRequested = MAKEWORD(2,0);
    if(WSAStartup(wVersionRequested, &wsaData) != 0)
    {
        fprintf(stderr, "windows sockets barfed\n");
        ExitProcess(2);
    }

    // prepare the inquiry data structure
    DWORD qs_len = sizeof(WSAQUERYSET);
    WSAQUERYSET *qs = (WSAQUERYSET*)malloc(qs_len);
    ZeroMemory(qs, qs_len);
    qs->dwSize = sizeof(WSAQUERYSET));
    qs->dwNameSpace = NS_BTH;

    DWORD flags = LUP_CONTAINERS;
    falgs |= LUP_FLUSHCACHE | LUP_RETURN_NAME | LUP_RETURN_ADDR;
    HANDLE h;

    // start the device inquiry
    if(SOCKET_ERROR == WSALookupServiceBegin(qs, flags, &h)){
        ExitProcess(2);
    }

     // iterate through the inquiry results bool done = false;
    while(!done)
    {
        if(NO_ERROR == WSALookupServiceNext(h, flags, &qs_len, qs))
        {
            char buf[40] = {0};
            SOCKADDR ̄BTH *sa = (SOCKADDR_BTH*)qs−>lpcsaBuffer−>RemoteAddr.lpSockaddr; BTH_ADDR result = sa−>btAddr;
            DWORD bufsize = sizeof(buf) ;
            WSAAddressToString (qs−>lpcsaBuffer−>RemoteAddr.lpSockaddr, sizeof ( SOCKADDR ̄BTH ) , NULL , buf , &bufsize ) ; printf( "found: %s - %s\n" , buf, qs−>lpszServiceInstanceName); int error = WSAGetLastError ( ) ;
            if( error == WSAEFAULT ) 
            {
                free( qs );
                qs = (WSAQUERYSET*) malloc( qs_len );
            } 
            else if( error == WSA_E_NO_MORE )
            {
                printf( "inquiry complete\n" ) ;
                done = true;
            }
            else
            {
                printf( "uh oh. error code %d\n" , error) ;
                done = true; 
            }
        }
    }
    WSALookupServiceEnd(h);
    free(qs);
    WSACLeanup();
    return 0;
}