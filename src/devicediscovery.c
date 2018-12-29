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
    
}