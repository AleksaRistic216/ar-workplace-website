#!/usr/bin/env python3
"""Read, crop and magnify a PNG using nothing but the standard library.

Chrome details in a full-page screenshot are a few pixels tall, which is too small to judge. This
enlarges a region so a capture of the site can be compared against a capture of the product.

    python3 scripts/pngcrop.py in.png out.png <x0> <y0> <x1> <y1> <scale>
"""

import struct, zlib, sys

def read_png(path):
    d = open(path,'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n'
    pos = 8; idat = b''; w=h=bd=ct=None
    while pos < len(d):
        ln = struct.unpack_from('>I', d, pos)[0]; tag = d[pos+4:pos+8]
        payload = d[pos+8:pos+8+ln]; pos += 12+ln
        if tag == b'IHDR':
            w,h,bd,ct = struct.unpack('>IIBB', payload[:10])
        elif tag == b'IDAT': idat += payload
        elif tag == b'IEND': break
    assert bd == 8 and ct in (2,6), (bd,ct)
    nch = 3 if ct==2 else 4
    raw = zlib.decompress(idat)
    stride = w*nch
    rows=[]; prev = bytearray(stride)
    p=0
    for y in range(h):
        f = raw[p]; p+=1
        line = bytearray(raw[p:p+stride]); p+=stride
        if f==1:
            for i in range(nch,stride): line[i]=(line[i]+line[i-nch])&255
        elif f==2:
            for i in range(stride): line[i]=(line[i]+prev[i])&255
        elif f==3:
            for i in range(stride):
                a=line[i-nch] if i>=nch else 0
                line[i]=(line[i]+((a+prev[i])>>1))&255
        elif f==4:
            for i in range(stride):
                a=line[i-nch] if i>=nch else 0
                b=prev[i]; c=prev[i-nch] if i>=nch else 0
                pp=a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
                pr = a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        rows.append(bytes(line)); prev=line
    return w,h,nch,rows

def write_png(path,w,h,rows):
    raw=b''.join(b'\x00'+r for r in rows)
    def ch(t,p): return struct.pack('>I',len(p))+t+p+struct.pack('>I',zlib.crc32(t+p)&0xffffffff)
    out=b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b'')
    open(path,'wb').write(out)

if __name__=='__main__':
    src,dst,x0,y0,x1,y1,S = sys.argv[1],sys.argv[2],*map(int,sys.argv[3:8])
    w,h,nch,rows=read_png(src)
    x1=min(x1,w); y1=min(y1,h)
    out=[]
    for y in range(y0,y1):
        r=rows[y]; line=bytearray()
        for x in range(x0,x1):
            line += bytes(r[x*nch:x*nch+3])*S
        for _ in range(S): out.append(bytes(line))
    write_png(dst,(x1-x0)*S,(y1-y0)*S,out)
    print(dst,(x1-x0)*S,'x',(y1-y0)*S)
import struct, zlib, sys

def read_png(path):
    d = open(path,'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n'
    pos = 8; idat = b''; w=h=bd=ct=None
    while pos < len(d):
        ln = struct.unpack_from('>I', d, pos)[0]; tag = d[pos+4:pos+8]
        payload = d[pos+8:pos+8+ln]; pos += 12+ln
        if tag == b'IHDR':
            w,h,bd,ct = struct.unpack('>IIBB', payload[:10])
        elif tag == b'IDAT': idat += payload
        elif tag == b'IEND': break
    assert bd == 8 and ct in (2,6), (bd,ct)
    nch = 3 if ct==2 else 4
    raw = zlib.decompress(idat)
    stride = w*nch
    rows=[]; prev = bytearray(stride)
    p=0
    for y in range(h):
        f = raw[p]; p+=1
        line = bytearray(raw[p:p+stride]); p+=stride
        if f==1:
            for i in range(nch,stride): line[i]=(line[i]+line[i-nch])&255
        elif f==2:
            for i in range(stride): line[i]=(line[i]+prev[i])&255
        elif f==3:
            for i in range(stride):
                a=line[i-nch] if i>=nch else 0
                line[i]=(line[i]+((a+prev[i])>>1))&255
        elif f==4:
            for i in range(stride):
                a=line[i-nch] if i>=nch else 0
                b=prev[i]; c=prev[i-nch] if i>=nch else 0
                pp=a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
                pr = a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        rows.append(bytes(line)); prev=line
    return w,h,nch,rows

def write_png(path,w,h,rows):
    raw=b''.join(b'\x00'+r for r in rows)
    def ch(t,p): return struct.pack('>I',len(p))+t+p+struct.pack('>I',zlib.crc32(t+p)&0xffffffff)
    out=b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b'')
    open(path,'wb').write(out)

if __name__=='__main__':
    src,dst,x0,y0,x1,y1,S = sys.argv[1],sys.argv[2],*map(int,sys.argv[3:8])
    w,h,nch,rows=read_png(src)
    x1=min(x1,w); y1=min(y1,h)
    out=[]
    for y in range(y0,y1):
        r=rows[y]; line=bytearray()
        for x in range(x0,x1):
            line += bytes(r[x*nch:x*nch+3])*S
        for _ in range(S): out.append(bytes(line))
    write_png(dst,(x1-x0)*S,(y1-y0)*S,out)
    print(dst,(x1-x0)*S,'x',(y1-y0)*S)
