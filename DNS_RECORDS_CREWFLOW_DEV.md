# 🌐 DNS Records for crewflow.dev

## 📋 Quick Reference

Copy these exact DNS records into your Namecheap DNS management:

### Required DNS Records

#### 1. A Record (Root Domain)
```
Type: A Record
Host: @
Value: 76.76.19.61
TTL: Automatic (or 300)
```

#### 2. CNAME Record (WWW Subdomain)
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic (or 300)
```

## 🔧 How to Add in Namecheap

1. **Login to Namecheap** → Domain List
2. **Click "Manage"** next to `crewflow.dev`
3. **Go to "Advanced DNS"** tab
4. **Delete existing A records** for `@` if any
5. **Click "Add New Record"** for each record above
6. **Save changes**

## ✅ Verification

After adding records, verify with:
- [whatsmydns.net](https://whatsmydns.net) - Check `crewflow.dev`
- Should resolve to `76.76.19.61`

## ⏱️ Propagation Time

- **Namecheap**: Usually 5-30 minutes
- **Global**: Up to 24 hours
- **Vercel SSL**: Automatic after DNS resolves

## 🚨 Important Notes

- **.dev domains require HTTPS** (built-in security)
- **Vercel provides automatic SSL** certificates
- **Both `crewflow.dev` and `www.crewflow.dev`** will work
- **HTTP automatically redirects to HTTPS**

---

**After DNS propagation, your CrewFlow platform will be live at `https://crewflow.dev`!** 🚢
